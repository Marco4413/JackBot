const XML2JS = require("xml2js");
const Database = require("../../Database.js");
const Utils = require("../../Utils.js");
const { Client } = require("../../Client.js");
const { fetch } = require("cross-fetch");
const Logger = require("../../Logger.js");

const {
    NotificationSyncToDatabase,
    NotificationSubscribe, NotificationUnsubscribe,
    NotificationNotify,
    NotificationGetSocialUrl,
    NotificationExports
} = require("./AbstractNotification.js");

/** @type {Record<String, Boolean>} */
let _Subscriptions = { };

/**
 * @param {String} channelId
 * @returns {Promise<Object[]?>}
 */
const _FetchVideoFeed = async (channelId) => {
    try {
        const encodedId = encodeURIComponent(channelId);
        const videoFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodedId}`;
        const response = await fetch(videoFeedUrl, { "method": "GET" });
        if (!response.ok) return null;

        const xmlResponse = await response.text();
        const jsResponse = await XML2JS.parseStringPromise(xmlResponse);
        return jsResponse.feed.entry ?? [ ];
    } catch (error) {
        Logger.Error(error);
        return null;
    }
};

/** @type {NotificationSyncToDatabase} */
const SyncToDatabase = async () => {
    await Utils.LockTask("YouTubeNotification");
    _Subscriptions = { };
    const notifications = await Database.GetRows("youtubeNotification", { });
    Logger.Debug(notifications);
    for (let i = 0; i < notifications.length; i++)
        _Subscriptions[notifications[i].youtubeId] = true;
    Utils.UnlockTask("YouTubeNotification");
};

/** @type {NotificationSubscribe<Number>} */
const Subscribe = async (channelId) => {
    const videoFeed = await _FetchVideoFeed(channelId);
    console.log(videoFeed);
    if (videoFeed == null) return null;

    await Utils.LockTask("YouTubeNotification");
    if (_Subscriptions[channelId] == null)
        _Subscriptions[channelId] = true;
    Utils.UnlockTask("YouTubeNotification");
    
    if (videoFeed.length > 0) {
        const lastPublished = Date.parse(videoFeed[0].published[0]);
        return Number.isNaN(lastPublished) ? Date.now() : lastPublished;
    }
    return Date.now();
};

const _Unsubscribe = async (channelId) => {
    if (_Subscriptions[channelId])
        _Subscriptions[channelId] = undefined;
};

/** @type {NotificationUnsubscribe} */
const Unsubscribe = async (channelId) => {
    await Utils.LockTask("YouTubeNotification");
    await _Unsubscribe(channelId);
    Utils.UnlockTask("YouTubeNotification");
};

/** @type {NotificationNotify} */
const Notify = async () => {
    const ytChannelIds = Object.keys(_Subscriptions);
    for (let i = 0; i < ytChannelIds.length; i++) {
        await Utils.AsyncWait(1e3); // We wait 1 second for each query to yt

        const ytChannelId = ytChannelIds[i];
        const notifications = await Database.GetRows("youtubeNotification", {
            "youtubeId": ytChannelId
        });

        if (notifications.length === 0) {
            Unsubscribe(ytChannelId);
            continue;
        }

        const videoFeed = await _FetchVideoFeed(ytChannelId);

        let lastVideoTimestamp = -1;
        for (let j = videoFeed.length - 1; j >= 0; j--) {
            const video = videoFeed[j];
            const publishDate = Date.parse(video.published[0]);
            if (publishDate > lastVideoTimestamp) lastVideoTimestamp = publishDate;

            for (let k = 0; k < notifications.length; k++) {
                const notification = notifications[k];
                if (publishDate > notification.lastVideoTimestamp) {
                    const guild = await Utils.SafeFetch(Client.guilds, notification.guildId);
                    if (guild == null) continue;
                    
                    const channel = await Utils.SafeFetch(guild.channels, notification.notificationChannelId);
                    if (channel == null) continue;
                    
                    try {
                        await channel.send(Utils.MapFormatString(
                            notification.notificationText, {
                                "author-name": Utils.EscapeDiscordSpecialCharacters(video.author[0].name[0]),
                                "author-url": video.author[0].uri[0],
                                "video-title": Utils.EscapeDiscordSpecialCharacters(video.title[0]),
                                "video-url": video.link[0].$.href
                            }
                        ));
                    } catch (error) {
                        Logger.Error(error);
                    }
                }
            }
        }

        if (lastVideoTimestamp >= 0) {
            await Database.SetRowAttr("youtubeNotification", {
                "youtubeId": ytChannelId
            }, { lastVideoTimestamp });
        }
    }
};

/** @type {NotificationGetSocialUrl} */
const GetSocialUrl = ytChannelId =>
    `https://www.youtube.com/channel/${encodeURIComponent(ytChannelId)}`;

/** @type {NotificationExports} */
module.exports = {
    SyncToDatabase, Subscribe, Unsubscribe, Notify, GetSocialUrl
};
