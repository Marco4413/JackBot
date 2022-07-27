const { CreateCommand, IsMissingPermissions, Permissions, Database, Utils } = require("../Command.js");

/** @type {import("../Command.js").CommandArgument[]} */
const _ConfigArguments = [ { "name": "[Enable]", "types": [ "boolean" ], "default": null } ];

/**
 * @param {String} settingName
 * @returns {import("../Command.js").CommandExecute}
 */
const _GetConfigCallback = (settingName) => {
    return async (msg, guild, locale, [ enable ]) => {
        let counter = null;
        if (enable == null) {
            counter = await Database.GetRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId });
        } else {
            counter = await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
                [settingName]: enable
            });
        }

        if (counter == null) {
            await msg.reply(locale.Get("noCountingHere"));
        } else {
            await msg.reply(locale.GetFormatted(`${settingName}Value`, {
                "value": counter[settingName]
            }));
        }
    };
};

module.exports = CreateCommand({
    "name": "counter",
    "shortcut": "count",
    "subcommands": [
        {
            "name": "start",
            "shortcut": "s",
            "channelPermissions": true,
            "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
            "execute": async (msg, guild, locale) => {
                const counter = await Database.CreateRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId });
                if (counter == null) {
                    await msg.reply(locale.Get("alreadyCounting"));
                } else {
                    await msg.reply(locale.Get("startedCounting"));
                    const response = await msg.channel.send(counter.count.toString());
                    await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
                        "lastMessageId": response.id
                    });
                    await response.react(locale.GetCommon("checkmark"));
                }
            }
        },
        {
            "name": "terminate",
            "shortcut": "term",
            "channelPermissions": true,
            "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
            "arguments": [
                {
                    "name": "[CHANNEL MENTION/ID]",
                    "types": [ "channel" ],
                    "default": null
                }
            ],
            "execute": async (msg, guild, locale, [ targetChannel ]) => {
                const isHere = targetChannel == null;

                let channelId = msg.channelId;
                if (!isHere) {
                    channelId = targetChannel;
                    const textChannel = await await Utils.SafeFetch(msg.guild.channels, channelId);
                    if (textChannel != null && await IsMissingPermissions(msg, locale, Permissions.FLAGS.MANAGE_CHANNELS, textChannel))
                        return;
                }

                const counter = await Database.GetRow("counter", { "guildId": msg.guildId, channelId });

                if (counter == null) {
                    await msg.reply(
                        isHere ?
                            locale.Get("noCountingHere") :
                            locale.GetFormatted(
                                "noCountingThere",
                                { "channel": Utils.MentionChannel(channelId) }
                            )
                    );
                } else {
                    await Database.RemoveRows("counter", { "guildId": msg.guildId, channelId });
                    await msg.reply(locale.GetFormatted(
                        isHere ? "stoppedCountingHere" : "stoppedCountingThere", {
                            "best-count": counter.bestCount,
                            "channel": Utils.MentionChannel(channelId)
                        }
                    ));
                }
            }
        },
        {
            "name": "config",
            "shortcut": "cfg",
            "channelPermissions": true,
            "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
            "subcommands": [
                {
                    "name": "allow-messages",
                    "shortcut": "am",
                    "arguments": _ConfigArguments,
                    "execute": _GetConfigCallback("allowMessages")
                },
                {
                    "name": "allow-errors",
                    "shortcut": "ae",
                    "arguments": _ConfigArguments,
                    "execute": _GetConfigCallback("allowErrors")
                },
                {
                    "name": "alternate-member",
                    "shortcut": "altm",
                    "arguments": _ConfigArguments,
                    "execute": _GetConfigCallback("alternateMember")
                }
            ]
        },
        {
            "name": "best",
            "shortcut": "b",
            "execute": async (msg, guild, locale) => {
                const counter = await Database.GetRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId });
                if (counter == null) {
                    await msg.reply(locale.Get("noCountingHere"));
                } else {
                    await msg.reply(locale.GetFormatted(
                        "bestCount", { "best-count": counter.bestCount }
                    ));
                }
            }
        },
        {
            "name": "list",
            "shortcut": "l",
            "execute": async (msg, guild, locale) => {
                const counters = await Database.GetRows("counter", { "guildId": msg.guildId });
                const embed =
                    Utils.GetDefaultEmbedForMessage(msg, false)
                        .setTitle(locale.Get("title"));

                if (counters.length === 0) {
                    embed.setDescription(locale.Get("noCounters"));
                } else {
                    for (let i = 0; i < counters.length; i++) {
                        const counter = counters[i];
                        const textChannel = await Utils.SafeFetch(msg.guild.channels, counter.channelId);

                        let channelName = counter.channelId;
                        if (textChannel != null) {
                            if (!msg.member.permissionsIn(textChannel).has(Permissions.FLAGS.VIEW_CHANNEL))
                                continue;
                            channelName = textChannel.name;
                        }

                        embed.addField(
                            locale.GetFormatted("counterTitle", {
                                "channel-name": channelName,
                                "count": counter.count,
                                "best-count": counter.bestCount
                            }),
                            locale.GetFormatted("counterDescription", {
                                "channel": Utils.MentionChannel(counter.channelId),
                                "count": counter.count,
                                "best-count": counter.bestCount
                            }),
                            false
                        );
                    }
                }

                await msg.channel.send({ "embeds": [ embed ] });
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        const counter = await Database.GetRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId });
        if (counter == null) {
            await msg.reply(locale.Get("noCountingHere"));
        } else {
            await msg.reply(locale.GetFormatted("currentCount", {
                "count": counter.count
            }));
        }
    }
});
