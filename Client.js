const fs = require("fs");
const { Client: DiscordClient, Intents, BaseGuildVoiceChannel, Guild } = require("discord.js");
const { getVoiceConnection, PlayerSubscription, joinVoiceChannel, createAudioPlayer, VoiceConnectionStatus, AudioPlayerStatus, createAudioResource } = require("@discordjs/voice");
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
 * Gets the voice connection for the guild or undefined if none
 * @param {Guild} guild The guild to get the voice connection for
 * @returns {PlayerSubscription|undefined} The voice connection of the guild or undefined if none
 */
const GetVoiceConnection = (guild) => {
    const guildVoiceConnection = getVoiceConnection(guild.id);
    if (guildVoiceConnection === undefined) return undefined;
    if (guildVoiceConnection.state.subscription === null) {
        Logger.Warn(`PlayerSubscription is null for guild "${guild.name}" (${guild.id}), destroying connection.`);
        guildVoiceConnection.destroy();
        return undefined;
    }

    return guildVoiceConnection.state.subscription;
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

let _GENTLEMAN_MODE = "./data/goodbye.wav";
if (!fs.existsSync(_GENTLEMAN_MODE))
    _GENTLEMAN_MODE = null;
else Logger.Info("GENTLEMAN MODE ACTIVATED!");

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

    /*  So here's the deal...
        Hear me out, because this is quite finicky to understand.
        We create an Interval which checks if the player status is Idle
        and there's no one left in the channel, if either one of those
        conditions is true we destroy the connection.
        This is done to not destroy the connection as soon as the player stops
        ( although it may happen if the interval triggers ).
        Then we add a listener for state change on the connection to clear
        the interval on destroy and destroy the connection when it's disconnected.
    */

    /** If -1 then it's not idle */
    let idleStartEpoch = -1;
    const intervalId = CreateInterval(id => {
        // The first condition should always be true because we clear the interval
        //  when it's destroyed
        if (voiceConnection.state.status !== VoiceConnectionStatus.Destroyed && (
            // If the bot is alone in the channel or the player has been idling for _PLAYER_IDLE_TIME
            voiceChannel.members.size <= 1 ||
            ( idleStartEpoch >= 0 && Date.now() - idleStartEpoch >= _PLAYER_IDLE_TIME )
        )) {
            if (_GENTLEMAN_MODE === null) {
                voiceConnection.destroy();
            } else {
                // This gentleman is a real CHAD, he says goodbye even if he's disconnecting
                //  because he's alone in the voice channel
                ClearInterval(id);
                const goodbye = createAudioResource(_GENTLEMAN_MODE);
                audioPlayer.on("stateChange", (oldState, newState) => {
                    if (newState.status === AudioPlayerStatus.Idle)
                        voiceConnection.destroy();
                });
                audioPlayer.play(goodbye);
            }
        }
    }, _PLAYER_UPDATE_INTERVAL);

    audioPlayer.on("stateChange", (oldState, newState) => {
        // If it's idle we save the epoch
        if (newState.status === AudioPlayerStatus.Idle)
            idleStartEpoch = Date.now();
        // Else we set the epoch to -1
        else idleStartEpoch = -1;
    });

    voiceConnection.on("stateChange", (oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Destroyed)
            ClearInterval(intervalId);
        else if (newState.status === VoiceConnectionStatus.Disconnected)
            voiceConnection.destroy();
    });

    return voiceConnection.subscribe(audioPlayer);
};

/**
 * This gets or creates a new Voice Connection on the specified Channel and switches channel if needed
 * @param {BaseGuildVoiceChannel} voiceChannel The channel to create the connection on
 * @param {Boolean} [switchChannel] Whether or not to switch channel if already in one
 * @returns {PlayerSubscription} The new connection
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
