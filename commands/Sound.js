const fs = require("fs");
const path = require("path");
const { parseFile, IAudioMetadata } = require("music-metadata");
const { createAudioResource } = require("@discordjs/voice");

const { CreateCommand, IsMissingPermissions, Permissions, Utils } = require("../Command.js");
const { IsVoiceConnectionIdle, GetOrCreateVoiceConnection, GetVoiceConnection } = require("../Client.js");
const Logger = require("../Logger.js");

const _SOUNDS_FOLDER = "./data/sounds";
const _SOUNDS_ALT_FOLDER = path.join(_SOUNDS_FOLDER, "alts");
const _SOUNDS_CONFIG_PATH = path.join(_SOUNDS_FOLDER, "config.json");
const _AUDIO_NAME_TO_FILE = { };

const _AUDIO_EXTENSIONS = [ "mp3", "wav" ];
const _AUDIO_REGEXP = new RegExp(`^(.+)\\.(?:${Utils.JoinArray(_AUDIO_EXTENSIONS, "|")})$`);

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
 * @param {String} folderPath 
 * @returns {{ name: String, path: String }[]}
 */
const _GetAllAudioInFolder = (folderPath) => {
    const validAudio = [ ];
    const allAudio = fs.readdirSync(folderPath);
    for (let i = 0; i < allAudio.length; i++) {
        const audio = allAudio[i];
        const audioMatch = _AUDIO_REGEXP.exec(audio);
        if (audioMatch !== null) {
            validAudio.push({
                "name": audioMatch[1],
                "path": path.join(folderPath, audioMatch[0])
            });
        }
    }
    return validAudio;
};

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
    fs.mkdirSync(_SOUNDS_FOLDER, { "recursive": true });

    // Check if the config exists, if so parse it
    const hasConfig = fs.existsSync(_SOUNDS_CONFIG_PATH);
    const soundsConfigFolder = path.dirname(_SOUNDS_CONFIG_PATH);
    
    let soundsConfig = { };
    let altsRootFolder = _SOUNDS_ALT_FOLDER;

    if (hasConfig) {
        let config = { };
        try {
            config = JSON.parse(fs.readFileSync(_SOUNDS_CONFIG_PATH));
        } catch (error) {
            Logger.Error("Error when reading/parsing sound config file:", error.stack);
        }

        if (config.altsRoot === undefined) { /* Ignore */ }
        else if (typeof config.altsRoot === "string")
            altsRootFolder = path.join(soundsConfigFolder, config.altsRoot);
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
    for (const sound of _GetAllAudioInFolder(_SOUNDS_FOLDER)) {
        // Normalize the sound name
        const soundName = sound.name.replace(/\s+/g, " ").trim().toLowerCase();

        // If a sound with the same name was already defined discard it
        if (_AUDIO_NAME_TO_FILE[soundName] !== undefined) {
            Logger.Warn(`Sound ${soundName} at "${_AUDIO_NAME_TO_FILE[soundName].path} is being skipped by "${sound.path}".`);
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
                const fullAltsPath = path.join(altsRootFolder, soundConfig.altsFolder);
                if (fs.existsSync(fullAltsPath)) {
                    alts = _GetAllAudioInFolder(fullAltsPath).map(alt => alt.path);
                } else Logger.Warn(`The path specified by config field altsFolder for sound "${soundName}" doesn't exist, no alt will be loaded.`);
            } else Logger.Warn(`Invalid config field altsFolder for sound "${soundName}", no alt will be loaded.`);
        }

        // Register the Sound
        _AUDIO_NAME_TO_FILE[soundName] = {
            "path": sound.path,
            "metadata": null,
            "altChance": altChance,
            "alts": alts
        };

        soundPromises.push((async () => {
            _AUDIO_NAME_TO_FILE[soundName].metadata = await parseFile(sound.path);
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
    const metadatumLocale = locale.command.metadata[metadatumKey];
    if (metadatumLocale === undefined) return;
    if (metadatum === undefined || metadatum === null) return;

    metadataList.push(Utils.FormatString(
        metadatumLocale,
        typeof metadatum === "number" ?
            metadatum.toFixed(locale.command.decimalPrecision) : "" + metadatum
    ));
};

/**
 * @param {import("../Localization.js").CommandLocale} locale
 * @param {IAudioMetadata} metadata
 * @returns {{ maxLineLength: Number, text: String }}
 */
const _FormatAudioMetadata = (locale, metadata) => {
    if (locale.command.metadata === undefined)
        return locale.command.noMetadata;
    
    /** @type {String[]} */
    const metadataList = [ ];
    _PushAudioMetadatum(metadataList, locale, "title"   , metadata.common.title   );
    _PushAudioMetadatum(metadataList, locale, "artist"  , metadata.common.artist  );
    _PushAudioMetadatum(metadataList, locale, "duration", metadata.format.duration);
    
    if (metadataList.length === 0)
        return { "maxLineLength": locale.command.noMetadata.length, "text": locale.command.noMetadata };
    
    return {
        "maxLineLength": metadataList.reduce((prev, curr) => Math.max(prev, curr.length), 0),
        "text": Utils.JoinArray(metadataList, "\n")
    };
};

// #endregion

/** @type {import("../Command.js").CommandExecute} */
const _ExecutePlaySound = async (msg, guild, locale, args) => {
    if (_AUDIO_LOADING_PROMISE !== null) return;

    // No audio specified
    if (args.length === 0) {
        await msg.reply(locale.command.noSoundSpecified);
        return;
    }

    // User is not connected
    const userVoiceChannel = msg.member.voice.channel;
    if (userVoiceChannel === null) {
        await msg.reply(locale.command.notConnected);
        return;
    }

    // User can't speak
    if (msg.member.voice.serverMute) {
        await msg.reply(locale.command.guildMuted);
        return;
    }

    if (await IsMissingPermissions(msg, locale, Permissions.FLAGS.SPEAK, userVoiceChannel)) {
        return;
    }

    // User's channel is not joinable and is not the same as the bot
    if (!userVoiceChannel.joinable && userVoiceChannel.id !== msg.guild.me.voice.channelId) {
        await msg.reply(locale.command.cantJoinChannel);
        return;
    }

    // Getting sound and checking if it exists
    const soundName = Utils.JoinArray(args, " ").toLowerCase();
    const soundPath = _GetSoundPath(soundName);

    if (soundPath === undefined) {
        await msg.reply(locale.command.noSoundFound);
        return;
    }

    if (!IsVoiceConnectionIdle(msg.guild)) {
        await msg.reply(locale.command.alreadyPlaying);
        return;
    }

    // Playing the sound
    const resource = createAudioResource(soundPath);
    GetOrCreateVoiceConnection(userVoiceChannel, true).player.play(resource);
    await msg.reply(Utils.FormatString(locale.command.playing, soundName));
};

module.exports = CreateCommand({
    "name": "sound",
    "shortcut": "s",
    "subcommands": [
        {
            "name": "list",
            "execute": async (msg, guild, locale) => {
                if (_AUDIO_LOADING_PROMISE !== null) return;

                const embed = Utils.GetDefaultEmbedForMessage(msg, true);
                embed.setTitle(locale.command.title).setDescription(locale.command.description);

                for (const soundName of Object.keys(_AUDIO_NAME_TO_FILE)) {
                    /** @type {AudioFileData} */
                    const sound = _AUDIO_NAME_TO_FILE[soundName];
                    const formattedMetadata = _FormatAudioMetadata(locale, sound.metadata);
                    embed.addField(
                        Utils.FormatString(locale.command.fieldTitle, soundName),
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
                    await msg.reply(locale.command.notConnected);
                    return;
                }
                
                // User can't speak
                if (msg.member.voice.serverMute) {
                    await msg.reply(locale.command.guildMuted);
                    return;
                }
        
                if (await IsMissingPermissions(msg, locale, Permissions.FLAGS.SPEAK, msg.guild.me.voice.channelId)) {
                    return;
                }

                if (IsVoiceConnectionIdle(msg.guild)) {
                    await msg.reply(locale.command.notPlaying);
                } else if (msg.guild.me.voice.channelId === msg.member.voice.channelId) {
                    voiceConnection.player.stop(true);
                    await msg.reply(locale.command.stopped);
                } else {
                    await msg.reply(locale.command.sameChannel);
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
                    await msg.reply(locale.command.notConnected);
                    return;
                }
                
                // User can't speak
                if (msg.member.voice.serverMute) {
                    await msg.reply(locale.command.guildMuted);
                    return;
                }
        
                if (await IsMissingPermissions(msg, locale, Permissions.FLAGS.SPEAK, msg.guild.me.voice.channelId)) {
                    return;
                }

                if (msg.guild.me.voice.channelId === msg.member.voice.channelId) {
                    voiceConnection.softDestroy();
                    await msg.reply(locale.command.leaving);
                } else {
                    await msg.reply(locale.command.sameChannel);
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
