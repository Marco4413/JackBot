const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

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
                    await (await msg.channel.send(counter.count.toString())).react(locale.common.checkmark);
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
                const channelId = isHere ? msg.channel.id : targetChannel;
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
                    "channelPermissions": true,
                    "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
                    "arguments": [
                        {
                            "name": "[Enable]",
                            "types": [ "boolean" ]
                        }
                    ],
                    "execute": async (msg, guild, locale, [ enable ]) => {
                        const counter = await Database.SetGuildCounterAttr(msg.guild.id, msg.channel.id, {
                            "allowMessages": enable
                        });
        
                        if (counter === undefined) {
                            await msg.reply(locale.command.noCountingHere);
                        } else {
                            await msg.reply(Utils.FormatString(locale.command.allowMessagesChange, counter.allowMessages));
                        }
                    }
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
                        const textChannel = await msg.guild.channels.fetch(counter.channelId);
                        embed.addField(
                            Utils.FormatString(locale.command.counterTitle, textChannel.name, counter.count, counter.bestCount),
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
