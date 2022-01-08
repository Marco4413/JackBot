const fs = require("fs");
const { Client: DiscordClient, Intents, BaseGuildVoiceChannel, Guild } = require("discord.js");
const {
    getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource,
    PlayerSubscription, VoiceConnectionStatus, VoiceConnection, AudioPlayerStatus, AudioPlayer
} = require("@discordjs/voice");
const Logger = require("./Logger.js");
const { CreateInterval, ClearInterval } = require("./Timing.js");
const Utils = require("./Utils.js");

const Client = new DiscordClient({
    "intents": Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_MEMBERS | Intents.FLAGS.GUILD_PRESENCES | Intents.FLAGS.GUILD_VOICE_STATES
});

Client.token = process.env["TOKEN"];

const _PLAYER_UPDATE_INTERVAL = Utils.GetEnvVariable("CLIENT_PLAYER_UPDATE_INTERVAL", Utils.AnyToNumber, 10e3, Logger.Warn);
const _PLAYER_IDLE_TIME = Utils.GetEnvVariable("CLIENT_PLAYER_IDLE_TIME", Utils.AnyToNumber, 60e3, Logger.Warn);

Client.on("error", Logger.Error);
Client.on("debug", Logger.Debug);
Client.on("warn" , Logger.Warn );

Client.once("ready", () => {
    Logger.Info("Bot Ready!");
});

process.once("SIGINT", () => {
    Client.destroy();
    Logger.Info("Bot Destroyed.");
});

/**
 * Registers all Event Listeners found in the Events folder
 */
const RegisterEventListeners = () => {
    const eventsFolder = "./events";
    fs.readdirSync(eventsFolder).forEach(file => {
        if (file.endsWith(".js")) {
            const script = require(`${eventsFolder}/${file}`);
            if (
                typeof script === "object" &&
                typeof script.event === "string" &&
                typeof script.callback === "function"
            ) {
                if (script.once === true) {
                    Client.once(script.event, script.callback);
                } else {
                    Client.on(script.event, script.callback);
                }
                Logger.Info(`Event Listener "${file}" registered to "${script.event}"!`);
            } else {
                Logger.Warn(`Event Listener "${file}" couldn't be loaded because it returned an invalid Event Listener.`);
            }
        }
    });
};

/**
 * @typedef {Object} ClientVoiceConnection
 * @property {AudioPlayer} player The {@link AudioPlayer} of the Connection
 * @property {VoiceConnection} connection The actual {@link VoiceConnection}
 * @property {() => Void} softDestroy Gently destroy the {@link VoiceConnection}, use this instead of {@link ClientVoiceConnection.destroy}
 * @property {() => Void} destroy Immediately destroy the {@link VoiceConnection}, using {@link ClientVoiceConnection.softDestroy} is preferred
 */

/**
 * @param {PlayerSubscription} playerSubscription
 * @returns {ClientVoiceConnection}
 */
const _WrapPlayerSubscription = (playerSubscription) => {
    return {
        "player": playerSubscription.player,
        "connection": playerSubscription.connection,
        "softDestroy": () => playerSubscription.player.emit("softDestroy"),
        "destroy": () => playerSubscription.player.emit("destroy")
    };
};

/**
 * Gets the voice connection for the guild or undefined if none
 * @param {Guild} guild The guild to get the voice connection for
 * @returns {ClientVoiceConnection|undefined} The voice connection of the guild or undefined if none
 */
const GetVoiceConnection = (guild) => {
    const guildVoiceConnection = getVoiceConnection(guild.id);
    if (guildVoiceConnection === undefined) return undefined;
    if (guildVoiceConnection.state.subscription === null) {
        Logger.Warn(`PlayerSubscription is null for guild "${guild.name}" (${guild.id}), destroying connection.`);
        guildVoiceConnection.destroy();
        return undefined;
    }

    return _WrapPlayerSubscription(
        guildVoiceConnection.state.subscription
    );
};

/**
 * Checks if the voice connection on the specified Guild is Idle
 * @param {Guild} guild The Guild to check the Voice Connection for
 * @returns {Boolean} Whether or not the voice connection on the specified guild is Idle
 */
const IsVoiceConnectionIdle = (guild) => {
    const voiceConnection = GetVoiceConnection(guild);
    return voiceConnection === undefined || voiceConnection.player.state.status === AudioPlayerStatus.Idle;
};

const _GENTLEMEN = Utils.GetAudioFilesInDirectory("./data/gentlemen").map(file => file.fullPath);
if (_GENTLEMEN.length > 0) Logger.Info(`(${_GENTLEMEN.length}) GENTLEMEN MODE ACTIVATED!`);

/** @param {BaseGuildVoiceChannel} voiceChannel */
const _CreateVoiceConnection = (voiceChannel) => {
    const voiceConnection = joinVoiceChannel({
        "guildId": voiceChannel.guildId,
        "channelId": voiceChannel.id,
        "adapterCreator": voiceChannel.guild.voiceAdapterCreator,
        "selfDeaf": true,
        "selfMute": false
    });

    const audioPlayer = createAudioPlayer({ "debug": true });

    /** If -1 then it's not idle */
    let idleStartEpoch = -1;
    audioPlayer.on("stateChange", (oldState, newState) => {
        // If it's idle we save the epoch
        if (newState.status === AudioPlayerStatus.Idle)
            idleStartEpoch = Date.now();
        // Else we set the epoch to -1
        else idleStartEpoch = -1;
    });

    // We use an interval instead of a timeout because a timeout should
    //  be created and cleared each time and that can get slow
    const intervalId = CreateInterval(() => {
        // If no one is connected to the channel or we've
        //  been idling for too long destroy the connection
        if (voiceChannel.members.size <= 1 ||
            ( idleStartEpoch >= 0 && Date.now() - idleStartEpoch >= _PLAYER_IDLE_TIME )
        ) audioPlayer.emit("softDestroy");
    }, _PLAYER_UPDATE_INTERVAL);

    audioPlayer.once("softDestroy", () => {
        if (voiceConnection.state.status === VoiceConnectionStatus.Destroyed) return;
        
        if (_GENTLEMEN.length === 0) {
            audioPlayer.emit("destroy");
        } else {
            ClearInterval(intervalId);
            const goodbye = createAudioResource(Utils.GetRandomArrayElement(_GENTLEMEN));
            audioPlayer.on("stateChange", (oldState, newState) => {
                if (newState.status === AudioPlayerStatus.Idle)
                    audioPlayer.emit("destroy");
            });
            audioPlayer.play(goodbye);
        }
    });

    audioPlayer.once("destroy", () => {
        if (voiceConnection.state.status === VoiceConnectionStatus.Destroyed) return;
        voiceConnection.destroy();
    });

    voiceConnection.on("stateChange", (oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Destroyed)
            ClearInterval(intervalId);
        else if (newState.status === VoiceConnectionStatus.Disconnected)
            voiceConnection.destroy();
    });

    return _WrapPlayerSubscription(
        voiceConnection.subscribe(audioPlayer)
    );
};

/**
 * This gets or creates a new Voice Connection on the specified Channel and switches channel if needed
 * @param {BaseGuildVoiceChannel} voiceChannel The channel to create the connection on
 * @param {Boolean} [switchChannel] Whether or not to switch channel if already in one
 * @returns {ClientVoiceConnection} The new connection
 */
const GetOrCreateVoiceConnection = (voiceChannel, switchChannel = true) => {
    const voiceSub = GetVoiceConnection(voiceChannel.guild);
    if (voiceSub === undefined) {
        return _CreateVoiceConnection(voiceChannel);
    }

    if (switchChannel && voiceChannel.guild.me.voice.channelId !== voiceChannel.id) {
        voiceSub.connection.destroy();
        return _CreateVoiceConnection(voiceChannel);
    }

    return voiceSub;
};

module.exports = {
    Client, RegisterEventListeners,
    GetVoiceConnection, IsVoiceConnectionIdle, GetOrCreateVoiceConnection
};
