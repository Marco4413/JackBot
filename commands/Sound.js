const fs = require("fs");
const path = require("path");
const { parseFile, IAudioMetadata } = require("music-metadata");

const { BaseGuildVoiceChannel } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, createAudioResource, createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus, PlayerSubscription } = require("@discordjs/voice");

const { CreateCommand, IsMissingPermissions, Permissions, Utils } = require("../Command.js");
const { CreateInterval, ClearInterval } = require("../Timing.js");
const Logger = require("../Logger.js");

const _PLAYER_IDLE_CHECK_INTERVAL = 10e3;
const _SOUNDS_FOLDER = "./data/sounds";
const _AUDIO_EXTENSIONS = [ "mp3", "wav" ];
const _AUDIO_NAME_TO_FILE = { };

/**
 * @typedef {Object} AudioFileData
 * @property {String} path
 * @property {IAudioMetadata?} metadata
 */

// #region Loading Sounds

let _AUDIO_LOADING_PROMISE = null;

{
    fs.mkdirSync(_SOUNDS_FOLDER, { "recursive": true });
    const audioRegex = new RegExp(`^(.+)\\.(?:${Utils.JoinArray(_AUDIO_EXTENSIONS, "|")})$`);
    const allSounds = fs.readdirSync(_SOUNDS_FOLDER);

    const soundPromises = [ ];
    for (let i = 0; i < allSounds.length; i++) {
        const sound = allSounds[i];
        const soundMatch = audioRegex.exec(sound);
        if (soundMatch !== null) {
            const soundName = soundMatch[1].replace(/\s+/g, " ").trim().toLowerCase();
            const soundPath = path.join(_SOUNDS_FOLDER, soundMatch[0]);

            if (_AUDIO_NAME_TO_FILE[soundName] !== undefined) {
                Logger.Warn(`Sound ${soundName} at "${_AUDIO_NAME_TO_FILE[soundName].path} is being replaced by "${soundPath}".`);
            }

            _AUDIO_NAME_TO_FILE[soundName] = {
                "path": soundPath,
                "metadata": null
            };

            soundPromises.push((async () => {
                _AUDIO_NAME_TO_FILE[soundName].metadata = await parseFile(soundPath);
            })());
        }
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
 * @returns {String}
 */
const _FormatAudioMetadata = (locale, metadata) => {
    if (locale.command.metadata === undefined)
        return locale.command.noMetadata;
    
    const metadataList = [ ];
    _PushAudioMetadatum(metadataList, locale, "artist"  , metadata.common.artist  );
    _PushAudioMetadatum(metadataList, locale, "duration", metadata.format.duration);
    
    if (metadataList.length === 0)
        return locale.command.noMetadata;
    
    return Utils.JoinArray(metadataList, "\n");
};

// #endregion

/**
 * @param {BaseGuildVoiceChannel} voiceChannel
 * @returns {PlayerSubscription}
 */
const _CreateVoiceConnection = (voiceChannel) => {
    const voiceConnection = joinVoiceChannel({
        "guildId": voiceChannel.guildId,
        "channelId": voiceChannel.id,
        "adapterCreator": voiceChannel.guild.voiceAdapterCreator,
        "selfDeaf": true,
        "selfMute": false
    });

    const audioPlayer = createAudioPlayer({ "debug": true });

    /*  So here's the deal...
        Hear me out, because this is quite finicky to understand.
        We create an Interval which checks is the player status is Idle
        because we don't want to destroy the connection as soon as the
        resource ends.
        Then we add a listener for state change on the connection to clear
        the interval on destroy ( which is also called when the interval's
        id can't be accessed ) and destroy the connection when it's disconnected.
    */
    const intervalId = CreateInterval(id => {
        if (voiceConnection.state.status !== VoiceConnectionStatus.Destroyed &&
            audioPlayer.state.status === AudioPlayerStatus.Idle
        ) voiceConnection.destroy();
    }, _PLAYER_IDLE_CHECK_INTERVAL);

    voiceConnection.on("stateChange", (oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Destroyed)
            ClearInterval(intervalId);
        else if (newState.status === VoiceConnectionStatus.Disconnected)
            voiceConnection.destroy();
    });

    return voiceConnection.subscribe(audioPlayer);
};

module.exports = CreateCommand({
    "name": "sound",
    "shortcut": "s",
    "subcommands": [
        {
            "name": "list",
            "shortcut": "l",
            "execute": async (msg, guild, locale) => {
                if (_AUDIO_LOADING_PROMISE !== null) return;

                const embed = Utils.GetDefaultEmbedForMessage(msg, true);
                embed.setTitle(locale.command.title).setDescription(locale.command.description);

                for (const soundName of Object.keys(_AUDIO_NAME_TO_FILE)) {
                    /** @type {AudioFileData} */
                    const sound = _AUDIO_NAME_TO_FILE[soundName];
                    embed.addField(soundName, _FormatAudioMetadata(locale, sound.metadata));
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
                const voiceConnection = getVoiceConnection(msg.guildId);
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

                // Check if we're actually playing anything and if the user is in the same voice channel
                /** @type {PlayerSubscription} */
                const playerSubscription = voiceConnection.state.subscription;
                Logger.Assert(playerSubscription !== null, "Player Subscription is null ( Check Assertion on base command ).");

                if (playerSubscription.player.state.status === AudioPlayerStatus.Idle) {
                    await msg.reply(locale.command.notPlaying);
                } else if (msg.guild.me.voice.channelId === msg.member.voice.channelId) {
                    playerSubscription.player.stop(true);
                    await msg.reply(locale.command.stopped);
                } else {
                    await msg.reply(locale.command.sameChannel);
                }
            }
        }
    ],
    "execute": async (msg, guild, locale, args) => {
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

        // User's channel is not joinable
        if (!userVoiceChannel.joinable) {
            await msg.reply(locale.command.cantJoinChannel);
            return;
        }

        // Getting sound and checking if it exists
        const soundName = Utils.JoinArray(args, " ").toLowerCase();
        /** @type {AudioFileData} */
        const sound = _AUDIO_NAME_TO_FILE[soundName];

        if (sound === undefined) {
            await msg.reply(locale.command.noSoundFound);
            return;
        }

        // Getting the voice connection
        const voiceConnection = getVoiceConnection(msg.guildId);
        /** @type {PlayerSubscription} */
        let playerSubscription;
        
        const voice = msg.guild.me.voice;
        if (voiceConnection === undefined) {
            // If the voice connection doesn't exist then create one
            playerSubscription = _CreateVoiceConnection(userVoiceChannel);
        } else {
            // If we have a voice connection we need to make sure that we're not playing anything
            playerSubscription = voiceConnection.state.subscription;
            Logger.Assert(playerSubscription !== null, "Player Subscription is null, why shouldn't this be the case you may ask... Well, we create one every time.");

            if (playerSubscription.player.state.status !== AudioPlayerStatus.Idle) {
                await msg.reply(locale.command.alreadyPlaying);
                return;
            }
            
            // If we need to change channel we destroy the connection and create it again
            if (voice.channelId !== userVoiceChannel.id) {
                voiceConnection.destroy();
                playerSubscription = _CreateVoiceConnection(userVoiceChannel);
            }
        }

        // Playing the sound
        const resource = createAudioResource(sound.path);
        playerSubscription.player.play(resource);
        await msg.reply(Utils.FormatString(locale.command.playing, soundName));
    }
});
