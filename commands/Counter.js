const { CreateCommand, IsMissingPermissions, Permissions, Database, Utils } = require("../Command.js");

/** @type {import("../Command.js").CommandArgument[]} */
const _ConfigArguments = [ { "name": "[Enable]", "types": [ "boolean" ], "default": null } ];

/**
 * @param {String} settingName
 * @returns {import("../Command.js").CommandExecute}
 */
const _GetConfigCallback = (settingName) => {
    return async (msg, guild, locale, [ enable ]) => {
        let counter = undefined;
        if (enable === null) {
            counter = await Database.GetGuildCounter(msg.guild.id, msg.channel.id);
        } else {
            counter = await Database.SetGuildCounterAttr(msg.guild.id, msg.channel.id, {
                [settingName]: enable
            });
        }

        if (counter === undefined) {
            await msg.reply(locale.command.noCountingHere);
        } else {
            await msg.reply(Utils.FormatString(locale.command[`${settingName}Value`], counter[settingName]));
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
                const counter = await Database.CreateGuildCounter(msg.guild.id, msg.channel.id);
                if (counter === undefined) {
                    await msg.reply(locale.command.alreadyCounting);
                } else {
                    await msg.reply(locale.command.startedCounting);
                    const response = await msg.channel.send(counter.count.toString());
                    await response.react(locale.common.checkmark);
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
                    "types": [ "text-channel", "string" ],
                    "default": null
                }
            ],
            "execute": async (msg, guild, locale, [ targetChannel ]) => {
                const isHere = targetChannel === null;

                let channelId = msg.channel.id;
                if (!isHere) {
                    channelId = targetChannel;
                    const textChannel = await msg.guild.channels.resolve(channelId);
                    if (textChannel !== null && await IsMissingPermissions(msg, locale, Permissions.FLAGS.MANAGE_CHANNELS, textChannel))
                        return;
                }

                const counter = await Database.GetGuildCounter(msg.guild.id, channelId);

                if (counter === undefined) {
                    await msg.reply(
                        isHere ?
                            locale.command.noCountingHere :
                            Utils.FormatString(locale.command.noCountingThere, Utils.MentionTextChannel(channelId))
                    );
                } else {
                    await Database.RemoveGuildCounter(msg.guild.id, channelId);
                    await msg.reply(Utils.FormatString(
                        isHere ? locale.command.stoppedCountingHere : locale.command.stoppedCountingThere,
                        counter.bestCount, Utils.MentionTextChannel(channelId)
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
                const counter = await Database.GetGuildCounter(msg.guild.id, msg.channel.id);
                if (counter === undefined) {
                    await msg.reply(locale.command.noCountingHere);
                } else {
                    await msg.reply(Utils.FormatString(locale.command.bestCount, counter.bestCount));
                }
            }
        },
        {
            "name": "list",
            "shortcut": "l",
            "execute": async (msg, guild, locale) => {
                const counters = await Database.GetGuildCounters(msg.guild.id);
                const embed =
                    Utils.GetDefaultEmbedForMessage(msg, false)
                        .setTitle(locale.command.title);

                if (counters.length === 0) {
                    embed.setDescription(locale.command.noCounters);
                } else {
                    for (let i = 0; i < counters.length; i++) {
                        const counter = counters[i];
                        const textChannel = await msg.guild.channels.resolve(counter.channelId);

                        let channelName = counter.channelId;
                        if (textChannel !== null) {
                            if (!msg.member.permissionsIn(textChannel).has(Permissions.FLAGS.VIEW_CHANNEL))
                                continue;
                            channelName = textChannel.name;
                        }

                        embed.addField(
                            Utils.FormatString(locale.command.counterTitle, channelName, counter.count, counter.bestCount),
                            Utils.FormatString(locale.command.counterDescription, Utils.MentionTextChannel(counter.channelId), counter.count, counter.bestCount),
                            false
                        );
                    }
                }

                await msg.channel.send({ "embeds": [ embed ] });
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        const counter = await Database.GetGuildCounter(msg.guild.id, msg.channel.id);
        if (counter === undefined) {
            await msg.reply(locale.command.noCountingHere);
        } else {
            await msg.reply(Utils.FormatString(locale.command.currentCount, counter.count));
        }
    }
});
