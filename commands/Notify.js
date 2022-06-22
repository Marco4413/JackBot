const Sequelize = require("sequelize");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "notify",
    "permissions": Permissions.FLAGS.ADMINISTRATOR,
    "subcommands": [{
        "name": "voice",
        "subcommands": [{
            "name": "join",
            "subcommands": [{
                "name": "add",
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
                    const voiceChannel = msg.guild.channels.resolve(voiceChannelId);
                    if (voiceChannel == null) {
                        await msg.reply(locale.Get("noVoiceChannelFound"));
                        return;
                    } else if (!voiceChannel.isVoice()) {
                        await msg.reply(locale.Get("notVoiceChannel"));
                        return;
                    }

                    const notificationChannel = msg.guild.channels.resolve(notificationChannelId);
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
                "arguments": [{
                    "name": "[VOICE CHANNEL MENTION/ID]",
                    "types": [ "channel" ]
                }],
                "execute": async (msg, guild, locale, [ voiceChannelId ]) => {
                    const replyFormats = {
                        "voice-channel": locale.GetSoftMention(
                            "Channel",
                            msg.guild.channels.resolve(voiceChannelId)?.name,
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
                "subcommands": [{
                    "name": "all",
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
                                    msg.guild.channels.resolve(voiceChannelId)?.name,
                                    voiceChannelId
                                )
                            }
                        ));
                    } else {
                        await msg.reply(locale.GetFormatted(
                            "notificationDetails", {
                                "voice-channel": locale.GetSoftMention(
                                    "Channel",
                                    msg.guild.channels.resolve(voiceChannelId)?.name,
                                    voiceChannelId
                                ),
                                "text-channel": locale.GetSoftMention(
                                    "Channel",
                                    msg.guild.channels.resolve(channelRow.joinNotificationChannelId)?.name,
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
    }]
});
