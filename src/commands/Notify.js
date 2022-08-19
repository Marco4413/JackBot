const Sequelize = require("sequelize");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");
const YouTubeNotification = require("./notifications/YouTubeNotification.js");
const Timing = require("../Timing.js");
const Logger = require("../Logger.js");

const _NOTIFICATIONS_UPDATE_INTERVAL = Utils.GetEnvVariable("NOTIFICATIONS_UPDATE_INTERVAL", Utils.AnyToNumber, 1800e3, Logger.Warn);

(async () => {
    await YouTubeNotification.SyncToDatabase();
    Timing.CreateInterval(async () => {
        await YouTubeNotification.Notify();
    }, _NOTIFICATIONS_UPDATE_INTERVAL);
})();

module.exports = CreateCommand({
    "name": "notify",
    "permissions": Permissions.FLAGS.ADMINISTRATOR,
    "subcommands": [{
        "name": "voice",
        "shortcut": "v",
        "subcommands": [{
            "name": "join",
            "shortcut": "j",
            "subcommands": [{
                "name": "add",
                "shortcut": "a",
                "arguments": [{
                    "name": "[VOICE CHANNEL MENTION/ID]",
                    "types": [ "channel" ]
                }, {
                    "name": "[NOTIFICATION CHANNEL MENTION/ID]",
                    "types": [ "channel" ]
                }, {
                    "name": "[MESSAGE]",
                    "types": [ "text" ]
                }],
                "execute": async (msg, guild, locale, [ voiceChannelId, notificationChannelId, notificationText ]) => {
                    const voiceChannel = await Utils.SafeFetch(msg.guild.channels, voiceChannelId);
                    if (voiceChannel == null) {
                        await msg.reply(locale.Get("noVoiceChannelFound"));
                        return;
                    } else if (!voiceChannel.isVoice()) {
                        await msg.reply(locale.Get("notVoiceChannel"));
                        return;
                    }

                    const notificationChannel = await Utils.SafeFetch(msg.guild.channels, notificationChannelId);
                    if (notificationChannel == null) {
                        await msg.reply(locale.Get("noTextChannelFound"));
                        return;
                    } else if (!notificationChannel.isText()) {
                        await msg.reply(locale.Get("notTextChannel"));
                        return;
                    }
                    
                    await Database.SetOrCreateRow("channel", {
                        "guildId": msg.guildId, "channelId": voiceChannelId
                    }, {
                        "joinNotificationChannelId": notificationChannelId,
                        "joinNotificationText": notificationText
                    });

                    await msg.reply(locale.GetFormatted(
                        "notificationAdded", {
                            "voice-channel": locale.GetSoftMention("Channel", voiceChannel?.name, voiceChannelId),
                            "text-channel": locale.GetSoftMention("Channel", notificationChannel?.name, notificationChannelId),
                        }
                    ));
                }
            }, {
                "name": "remove",
                "shortcut": "r",
                "arguments": [{
                    "name": "[VOICE CHANNEL MENTION/ID]",
                    "types": [ "channel" ]
                }],
                "execute": async (msg, guild, locale, [ voiceChannelId ]) => {
                    const replyFormats = {
                        "voice-channel": locale.GetSoftMention(
                            "Channel",
                            (await Utils.SafeFetch(msg.guild.channels, voiceChannelId))?.name,
                            voiceChannelId
                        )
                    };

                    const oldChannelRow = await Database.GetRow("channel", {
                        "guildId": msg.guildId, "channelId": voiceChannelId
                    });

                    if (oldChannelRow == null || 
                        oldChannelRow.joinNotificationChannelId == null ||
                        oldChannelRow.joinNotificationText == null
                    ) {
                        await msg.reply(locale.GetFormatted(
                            "noNotificationSet", replyFormats
                        ));
                        return;
                    }

                    await Database.SetRowAttr("channel", {
                        "guildId": msg.guildId, "channelId": voiceChannelId
                    }, {
                        "joinNotificationChannelId": null,
                        "joinNotificationText": null
                    });
                    
                    await msg.reply(locale.GetFormatted(
                        "notificationRemoved", replyFormats
                    ));
                }
            }, {
                "name": "list",
                "shortcut": "l",
                "subcommands": [{
                    "name": "all",
                    "shortcut": "a",
                    "execute": async (msg, guild, locale) => {
                        const channelRows = await Database.GetRows("channel", {
                            "guildId": msg.guildId,
                            "joinNotificationChannelId": {
                                [Sequelize.Op.ne]: null
                            },
                            "joinNotificationText": {
                                [Sequelize.Op.ne]: null
                            }
                        });

                        if (channelRows.length === 0) {
                            await msg.reply(locale.Get("notificationListNone"));
                        } else {
                            await msg.reply(locale.GetFormattedList(
                                channelRows, "notificationListEntry", row => ({
                                    "voice-channel": locale.GetSoftMention(
                                        "Channel",
                                        msg.guild.channels.resolve(row.channelId)?.name,
                                        row.channelId
                                    ),
                                    "text-channel": locale.GetSoftMention(
                                        "Channel",
                                        msg.guild.channels.resolve(row.joinNotificationChannelId)?.name,
                                        row.joinNotificationChannelId
                                    )
                                }), "notificationListAll"
                            ));
                        }
                    }
                }],
                "arguments": [{
                    "name": "[VOICE CHANNEL MENTION/ID]",
                    "types": [ "channel" ]
                }],
                "execute": async (msg, guild, locale, [ voiceChannelId ]) => {
                    const channelRow = await Database.GetRow("channel", {
                        "guildId": msg.guildId, "channelId": voiceChannelId,
                        "joinNotificationChannelId": {
                            [Sequelize.Op.ne]: null
                        },
                        "joinNotificationText": {
                            [Sequelize.Op.ne]: null
                        }
                    });

                    if (channelRow == null) {
                        await msg.reply(locale.GetFormatted(
                            "noNotificationSet", {
                                "voice-channel": locale.GetSoftMention(
                                    "Channel",
                                    (await Utils.SafeFetch(msg.guild.channels, voiceChannelId))?.name,
                                    voiceChannelId
                                )
                            }
                        ));
                    } else {
                        await msg.reply(locale.GetFormatted(
                            "notificationDetails", {
                                "voice-channel": locale.GetSoftMention(
                                    "Channel",
                                    (await Utils.SafeFetch(msg.guild.channels, voiceChannelId))?.name,
                                    voiceChannelId
                                ),
                                "text-channel": locale.GetSoftMention(
                                    "Channel",
                                    (await Utils.SafeFetch(msg.guild.channels, channelRow.joinNotificationChannelId))?.name,
                                    channelRow.joinNotificationChannelId
                                )
                            }
                        ));
                        await msg.channel.send(Utils.EscapeDiscordSpecialCharacters(
                            channelRow.joinNotificationText
                        ));
                    }
                }
            }]
        }]
    }, {
        "name": "social",
        "shortcut": "s",
        "subcommands": [{
            "name": "youtube",
            "shortcut": "yt",
            "subcommands": [{
                "name": "add",
                "shortcut": "a",
                "arguments": [{
                    "name": "[YT CHANNEL ID]",
                    "types": [ "string" ]
                }, {
                    "name": "[TEXT CHANNEL MENTION/ID]",
                    "types": [ "channel" ]
                }, {
                    "name": "[MESSAGE]",
                    "types": [ "text" ]
                }],
                "execute": async (msg, guild, locale, [ ytChannelId, notificationChannelId, notificationText ]) => {
                    if (notificationText.length === 0) {
                        await msg.reply(locale.Get("noMessage"));
                        return;
                    }

                    const notificationChannel = await Utils.SafeFetch(msg.guild.channels, notificationChannelId);
                    if (notificationChannel == null) {
                        await msg.reply(locale.Get("noTextChannelFound"));
                        return;
                    } else if (!notificationChannel.isText()) {
                        await msg.reply(locale.Get("notTextChannel"));
                        return;
                    }

                    const lastVideoTimestamp = await YouTubeNotification.Subscribe(ytChannelId);
                    if (lastVideoTimestamp == null) {
                        await msg.reply(locale.Get("ytChannelNotFound"));
                        return;
                    }

                    await Database.SetOrCreateRow("youtubeNotification", {
                        "guildId": msg.guildId,
                        "youtubeId": ytChannelId
                    }, {
                        "lastVideoTimestamp": lastVideoTimestamp,
                        "notificationChannelId": notificationChannelId,
                        "notificationText": notificationText
                    });

                    await msg.reply(locale.GetFormatted(
                        "notificationAdded", {
                            "text-channel": locale.GetSoftMention("Channel", notificationChannel?.name, notificationChannelId),
                        }
                    ));
                }
            }, {
                "name": "remove",
                "shortcut": "r",
                "arguments": [{
                    "name": "[YT CHANNEL ID]",
                    "types": [ "string" ]
                }],
                "execute": async (msg, guild, locale, [ ytChannelId ]) => {
                    const removedRows = await Database.RemoveRows("channel", {
                        "guildId": msg.guildId, "youtubeId": ytChannelId
                    });

                    if (removedRows > 0) {
                        await msg.reply(locale.GetFormatted(
                            "notificationRemoved", {
                                "youtube-id": ytChannelId,
                                "youtube-url": YouTubeNotification.GetSocialUrl(ytChannelId)
                            }
                        ));
                    } else {
                        await msg.reply(locale.Get("noNotificationSet"));
                    }
                }
            }, {
                "name": "list",
                "shortcut": "l",
                "subcommands": [{
                    "name": "all",
                    "shortcut": "a",
                    "execute": async (msg, guild, locale) => {
                        const notificationRows = await Database.GetRows("youtubeNotification", {
                            "guildId": msg.guildId
                        });

                        if (notificationRows.length === 0) {
                            await msg.reply(locale.Get("notificationListNone"));
                        } else {
                            await msg.reply(locale.GetFormattedList(
                                notificationRows, "notificationListEntry", row => ({
                                    "youtube-id": row.youtubeId,
                                    "youtube-url": YouTubeNotification.GetSocialUrl(row.youtubeId),
                                    "text-channel": locale.GetSoftMention(
                                        "Channel",
                                        msg.guild.channels.resolve(row.notificationChannelId)?.name,
                                        row.notificationChannelId
                                    )
                                }), "notificationListAll"
                            ));
                        }
                    }
                }],
                "arguments": [{
                    "name": "[YT CHANNEL ID]",
                    "types": [ "string" ]
                }],
                "execute": async (msg, guild, locale, [ ytChannelId ]) => {
                    const notificationRow = await Database.GetRow("youtubeNotification", {
                        "guildId": msg.guildId, "youtubeId": ytChannelId
                    });

                    if (notificationRow == null) {
                        await msg.reply(locale.Get("noNotificationSet"));
                    } else {
                        await msg.reply(locale.GetFormatted(
                            "notificationDetails", {
                                "youtube-id": notificationRow.youtubeId,
                                "youtube-url": YouTubeNotification.GetSocialUrl(notificationRow.youtubeId),
                                "text-channel": locale.GetSoftMention(
                                    "Channel",
                                    (await Utils.SafeFetch(msg.guild.channels, notificationRow.notificationChannelId))?.name,
                                    notificationRow.notificationChannelId
                                )
                            }
                        ));
                        
                        await msg.channel.send(Utils.EscapeDiscordSpecialCharacters(
                            notificationRow.notificationText
                        ));
                    }
                }
            }]
        }]
    }]
});
