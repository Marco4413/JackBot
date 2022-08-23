const Database = require("../../Database.js");
const Utils = require("../../Utils.js");
const { Client } = require("../../Client.js");
const Logger = require("../../Logger.js");
const Twitch = require("../../Twitch.js");

const {
    NotificationSyncToDatabase,
    NotificationSubscribe, NotificationUnsubscribe,
    NotificationNotify,
    NotificationGetSocialUrl,
    NotificationExports
} = require("./AbstractNotification.js");

/** @type {Record<String, Boolean>} */
let _Subscriptions = { };

/** @type {NotificationSyncToDatabase} */
const SyncToDatabase = async () => {
    await Utils.LockTask("TwitchNotification");
    _Subscriptions = { };
    const notifications = await Database.GetRows("twitchNotification", { });
    Logger.Debug(notifications);
    for (let i = 0; i < notifications.length; i++)
        _Subscriptions[notifications[i].twitchId] = true;
    Utils.UnlockTask("TwitchNotification");
};

/** @type {NotificationSubscribe<Boolean>} */
const Subscribe = async (channelId) => {
    const user = await Twitch.GetUserById(channelId);
    if (user == null) return null;

    await Utils.LockTask("TwitchNotification");
    if (_Subscriptions[channelId] == null)
        _Subscriptions[channelId] = true;
    Utils.UnlockTask("TwitchNotification");
    
    return await Twitch.GetStreamByUserId(channelId) != null;
};

const _Unsubscribe = async (channelId) => {
    if (_Subscriptions[channelId])
        _Subscriptions[channelId] = undefined;
};

/** @type {NotificationUnsubscribe} */
const Unsubscribe = async (channelId) => {
    await Utils.LockTask("TwitchNotification");
    await _Unsubscribe(channelId);
    Utils.UnlockTask("TwitchNotification");
};

/** @type {NotificationNotify} */
const Notify = async () => {
    const twitchChannelIds = Object.keys(_Subscriptions);
    for (let i = 0; i < twitchChannelIds.length; i++) {
        const twitchChannelId = twitchChannelIds[i];
        const notifications = await Database.GetRows("twitchNotification", {
            "twitchId": twitchChannelId
        });

        if (notifications.length === 0) {
            Unsubscribe(twitchChannelId);
            continue;
        }

        const stream = await Twitch.GetStreamByUserId(twitchChannelId);

        if (stream == null) {
            await Database.SetRowsAttr("twitchNotification", {
                "twitchId": twitchChannelId
            }, { "isStreaming": false });
            continue;
        }

        for (let j = 0; j < notifications.length; j++) {
            const notification = notifications[j];
            if (!notification.isStreaming) {
                const guild = await Utils.SafeFetch(Client.guilds, notification.guildId);
                if (guild == null) continue;
                
                const channel = await Utils.SafeFetch(guild.channels, notification.notificationChannelId);
                if (channel == null) continue;
                
                try {
                    await channel.send(Utils.MapFormatString(
                        notification.notificationText, {
                            "streamer-name": Utils.EscapeDiscordSpecialCharacters(stream.streamerDisplayName),
                            "streamer-url": stream.streamerUrl,
                            "stream-title": Utils.EscapeDiscordSpecialCharacters(stream.title),
                            "stream-thumbnail-url": stream.thumbnailUrl,
                            "stream-activity": Utils.EscapeDiscordSpecialCharacters(stream.gameName)
                        }
                    ));
                } catch (error) {
                    Logger.Error(error);
                }
            }

        }

        await Database.SetRowsAttr("twitchNotification", {
            "twitchId": twitchChannelId
        }, { "isStreaming": true });
    }
};

/** @type {NotificationGetSocialUrl} */
const GetSocialUrl = async (twitchId) =>
    await Twitch.GetUserUrlById(twitchId) ?? twitchId;

/** @type {NotificationExports} */
module.exports = {
    SyncToDatabase, Subscribe, Unsubscribe, Notify, GetSocialUrl
};
