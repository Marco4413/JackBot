const FS = require("fs");
const Path = require("path");
const { parseFile, IAudioMetadata } = require("music-metadata");
const { createAudioResource } = require("@discordjs/voice");

const { CreateCommand, IsMissingPermissions, Permissions, Database, Utils } = require("../Command.js");
const { IsVoiceConnectionIdle, GetOrCreateVoiceConnection, GetVoiceConnection } = require("../Client.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");
const Logger = require("../Logger.js");

const _SOUNDS_FOLDER = "./data/sounds";
const _SOUNDS_ALT_FOLDER = Path.join(_SOUNDS_FOLDER, "alts");
const _SOUNDS_CONFIG_PATH = Path.join(_SOUNDS_FOLDER, "config.json");
const _AUDIO_NAME_TO_FILE = { };

const _INLINE_LINE_CHAR_LIMIT = 60;

/**
 * @typedef {Object} AudioFileData
 * @property {String} path
 * @property {IAudioMetadata?} metadata
 * @property {Number} altChance
 * @property {String[]} alts
 */

// #region Loading Sounds

let _AUDIO_LOADING_PROMISE = null;

/**
 * @param {String} soundName
 * @returns {String}
 */
const _GetSoundPath = (soundName) => {
    /** @type {AudioFileData} */
    const sound = _AUDIO_NAME_TO_FILE[soundName];
    // If no sound exists then return undefined
    if (sound === undefined) return undefined;

    // If no alt exists then return the original sound
    if (sound.alts.length === 0) return sound.path;

    // Choose between alts and the original sound
    const random = Math.random();
    if (random <= sound.altChance) {
        return Utils.GetRandomArrayElement(sound.alts);
    } else return sound.path;
};

{
    FS.mkdirSync(_SOUNDS_FOLDER, { "recursive": true });

    // Check if the config exists, if so parse it
    const hasConfig = Utils.IsFile(_SOUNDS_CONFIG_PATH);
    const soundsConfigFolder = Path.dirname(_SOUNDS_CONFIG_PATH);
    
    let soundsConfig = { };
    let altsRootFolder = _SOUNDS_ALT_FOLDER;

    if (hasConfig) {
        let config = { };
        try {
            config = JSON.parse(FS.readFileSync(_SOUNDS_CONFIG_PATH));
        } catch (error) {
            Logger.Error("Error when reading/parsing sound config file:", error.stack);
        }

        if (config.altsRoot === undefined) { /* Ignore */ }
        else if (typeof config.altsRoot === "string")
            altsRootFolder = Path.join(soundsConfigFolder, config.altsRoot);
        else Logger.Warn(`Sound Config's altsRoot field is of wrong type, using the default value: "${altsRootFolder}"`);

        if (config.sounds === undefined) { /* Ignore */ }
        else if (typeof config.sounds === "object")
            soundsConfig = config.sounds;
        else Logger.Warn("Sound Config's sounds field is of wrong type.");
    } else {
        Logger.Warn(`No config for sounds found at "${_SOUNDS_CONFIG_PATH}"`);
    }

    const soundPromises = [ ];
    // Load all sounds from the sounds' folder
    for (const sound of Utils.GetAudioFilesInDirectory(_SOUNDS_FOLDER)) {
        // Normalize the sound name
        const soundName = sound.name.replace(/\s+/g, " ").trim().toLowerCase();

        // If a sound with the same name was already defined discard it
        if (_AUDIO_NAME_TO_FILE[soundName] !== undefined) {
            Logger.Warn(`Sound ${soundName} at "${_AUDIO_NAME_TO_FILE[soundName].path} is being skipped by "${sound.fullPath}".`);
            continue;
        }
        
        // Get settings from the config file
        let altChance = 0.5;
        let alts = [ ];
        if (soundsConfig[soundName] !== undefined) {
            const soundConfig = soundsConfig[soundName];

            // Get Alt Chance Settings
            if (typeof soundConfig.altChance === "number") altChance = soundConfig.altChance;
            else Logger.Warn(`Invalid config field altChance for sound "${soundName}", using the default value: ${altChance}.`);

            // Get Alts Folder Path
            if (typeof soundConfig.altsFolder === "string") {
                const fullAltsPath = Path.join(altsRootFolder, soundConfig.altsFolder);
                if (Utils.IsDirectory(fullAltsPath)) {
                    alts = Utils.GetAudioFilesInDirectory(fullAltsPath).map(alt => alt.fullPath);
                } else Logger.Warn(`The path specified by config field altsFolder for sound "${soundName}" doesn't exist, no alt will be loaded.`);
            } else Logger.Warn(`Invalid config field altsFolder for sound "${soundName}", no alt will be loaded.`);
        }

        // Register the Sound
        _AUDIO_NAME_TO_FILE[soundName] = {
            "path": sound.fullPath,
            "metadata": null,
            "altChance": altChance,
            "alts": alts
        };

        soundPromises.push((async () => {
            _AUDIO_NAME_TO_FILE[soundName].metadata = await parseFile(sound.fullPath);
        })());
    }

    _AUDIO_LOADING_PROMISE = Promise.allSettled(soundPromises);
    _AUDIO_LOADING_PROMISE.then(() => { _AUDIO_LOADING_PROMISE = null });
}
// #endregion

// #region Metadata formatting

/**
 * @param {String[]} metadataList
 * @param {import("../Localization.js").CommandLocale} locale
 * @param {String} metadatumKey
 * @param {IAudioMetadata?} [metadatum]
 */
const _PushAudioMetadatum = (metadataList, locale, metadatumKey, metadatum) => {
    const metadatumLocale = locale.Get("metadata", false)[metadatumKey];
    if (metadatumLocale === undefined) return;
    if (metadatum === undefined || metadatum === null) return;

    metadataList.push(Utils.FormatString(
        metadatumLocale,
        typeof metadatum === "number" ?
            metadatum.toFixed(locale.Get("decimalPrecision", false) ?? 2) : "" + metadatum
    ));
};

/**
 * @param {import("../Localization.js").CommandLocale} locale
 * @param {IAudioMetadata} metadata
 * @returns {{ maxLineLength: Number, text: String }}
 */
const _FormatAudioMetadata = (locale, metadata) => {
    if (locale.Get("metadata") === undefined)
        return locale.Get("noMetadata");
    
    /** @type {String[]} */
    const metadataList = [ ];
    _PushAudioMetadatum(metadataList, locale, "title"   , metadata.common.title   );
    _PushAudioMetadatum(metadataList, locale, "artist"  , metadata.common.artist  );
    _PushAudioMetadatum(metadataList, locale, "duration", metadata.format.duration);
    
    if (metadataList.length === 0)
        return { "maxLineLength": locale.Get("noMetadata.length"), "text": locale.Get("noMetadata") };
    
    return {
        "maxLineLength": metadataList.reduce((prev, curr) => Math.max(prev, curr.length), 0),
        "text": Utils.JoinArray(metadataList, "\n")
    };
};

// #endregion

/** @type {import("../Command.js").CommandExecute} */
const _ExecutePlaySound = async (msg, guild, locale, [ soundName ]) => {
    if (_AUDIO_LOADING_PROMISE !== null) return;

    // No audio specified
    if (soundName.length === 0) {
        await msg.reply(locale.Get("noSoundSpecified"));
        return;
    }

    // User is not connected
    const userVoiceChannel = msg.member.voice.channel;
    if (userVoiceChannel === null) {
        await msg.reply(locale.Get("notConnected"));
        return;
    }

    // User can't speak
    if (msg.member.voice.serverMute) {
        await msg.reply(locale.Get("guildMuted"));
        return;
    }

    if (await IsMissingPermissions(msg, locale, Permissions.FLAGS.SPEAK, userVoiceChannel)) {
        return;
    }

    // User's channel is not joinable and is not the same as the bot
    if (!userVoiceChannel.joinable && userVoiceChannel.id !== msg.guild.me.voice.channelId) {
        await msg.reply(locale.Get("cantJoinChannel"));
        return;
    }

    // Getting sound and checking if it exists
    const soundPath = _GetSoundPath(soundName);

    if (soundPath === undefined) {
        await msg.reply(locale.Get("noSoundFound"));
        return;
    }

    if (!IsVoiceConnectionIdle(msg.guild)) {
        await msg.reply(locale.Get("alreadyPlaying"));
        return;
    }

    // Playing the sound
    const resource = createAudioResource(soundPath);
    GetOrCreateVoiceConnection(userVoiceChannel, true).player.play(resource);
    await msg.reply(locale.GetFormatted("playing", soundName));
};

module.exports = CreateCommand({
    "name": "sound",
    "shortcut": "s",
    "canExecute": async (msg, guild, locale) =>
        !await ReplyIfBlacklisted(locale, "sound", msg, "inSoundAccessList", "isSoundAccessBlacklist"),
    "subcommands": [
        {
            "name": "list",
            "execute": async (msg, guild, locale) => {
                if (_AUDIO_LOADING_PROMISE !== null) return;

                const embed = Utils.GetDefaultEmbedForMessage(msg, true);
                embed.setTitle(locale.Get("title")).setDescription(locale.Get("description"));

                for (const soundName of Object.keys(_AUDIO_NAME_TO_FILE)) {
                    /** @type {AudioFileData} */
                    const sound = _AUDIO_NAME_TO_FILE[soundName];
                    Logger.Debug(sound);
                    const formattedMetadata = _FormatAudioMetadata(locale, sound.metadata);
                    embed.addField(
                        locale.GetFormatted("fieldTitle", soundName),
                        formattedMetadata.text,
                        formattedMetadata.maxLineLength <= _INLINE_LINE_CHAR_LIMIT
                    );
                }

                await msg.channel.send({
                    "embeds": [ embed ]
                });
            }
        },
        {
            "name": "stop",
            "shortcut": "s",
            "execute": async (msg, guild, locale) => {
                // Check if we're connected to a voice channel
                const voiceConnection = GetVoiceConnection(msg.guild);
                if (voiceConnection === undefined) {
                    await msg.reply(locale.Get("notConnected"));
                    return;
                }
                
                // User can't speak
                if (msg.member.voice.serverMute) {
                    await msg.reply(locale.Get("guildMuted"));
                    return;
                }
        
                if (await IsMissingPermissions(msg, locale, Permissions.FLAGS.SPEAK, msg.guild.me.voice.channelId)) {
                    return;
                }

                if (IsVoiceConnectionIdle(msg.guild)) {
                    await msg.reply(locale.Get("notPlaying"));
                } else if (msg.guild.me.voice.channelId === msg.member.voice.channelId) {
                    voiceConnection.player.stop(true);
                    await msg.reply(locale.Get("stopped"));
                } else {
                    await msg.reply(locale.Get("sameChannel"));
                }
            }
        },
        {
            "name": "leave",
            "shortcut": "l",
            "execute": async (msg, guild, locale) => {
                // Check if we're connected to a voice channel
                const voiceConnection = GetVoiceConnection(msg.guild);
                if (voiceConnection === undefined) {
                    await msg.reply(locale.Get("notConnected"));
                    return;
                }
                
                // User can't speak
                if (msg.member.voice.serverMute) {
                    await msg.reply(locale.Get("guildMuted"));
                    return;
                }
        
                if (await IsMissingPermissions(msg, locale, Permissions.FLAGS.SPEAK, msg.guild.me.voice.channelId)) {
                    return;
                }

                if (msg.guild.me.voice.channelId === msg.member.voice.channelId) {
                    voiceConnection.softDestroy();
                    await msg.reply(locale.Get("leaving"));
                } else {
                    await msg.reply(locale.Get("sameChannel"));
                }
            }
        },
        {
            "name": "play",
            "shortcut": "p",
            "execute": _ExecutePlaySound
        }
    ],
    "execute": _ExecutePlaySound
});
