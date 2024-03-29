const { ChannelType } = require ("discord.js");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");
const { SendNitroBoostEmbed } = require("./utils/BoostUtils.js");

module.exports = CreateCommand({
    "name": "boost",
    "permissions": Permissions.Flags.ManageGuild,
    "subcommands": [
        {
            "name": "channel",
            "shortcut": "ch",
            "subcommands": [
                {
                    "name": "set",
                    "shortcut": "s",
                    "arguments": [
                        {
                            "name": "[CHANNEL MENTION/ID]",
                            "types": [ "channel" ],
                            "default": null
                        }
                    ],
                    "execute": async (msg, guild, locale, [ channelId ]) => {
                        if (channelId == null) {
                            await Database.SetRowAttr("guild", { "id": msg.guildId }, {
                                "nitroBoostChannelId": null
                            });

                            await msg.reply(locale.Get("removedChannel"));
                            return;
                        }

                        const textChannel = await msg.guild.channels.fetch(channelId);
                        if (textChannel == null) {
                            await msg.reply(locale.Get("noChannel"));
                        } else if (textChannel.type === ChannelType.GuildText) {
                            const newGuild = await Database.SetRowAttr("guild", { "id": msg.guildId }, {
                                "nitroBoostChannelId": channelId
                            });

                            await msg.reply(locale.GetFormatted(
                                "setChannel", { "channel-mention": Utils.MentionChannel(newGuild.nitroBoostChannelId) }
                            ));
                        } else {
                            await msg.reply(locale.Get("noTextChannel"));
                        }
                    }
                }
            ],
            "execute": async (msg, guild, locale) => {
                if (guild.nitroBoostChannelId == null) {
                    await msg.reply(locale.Get("noCurrent"));
                } else {
                    await msg.reply(locale.GetFormatted(
                        "current", { "channel-mention": Utils.MentionChannel(guild.nitroBoostChannelId) }
                    ));
                }
            }
        },
        {
            "name": "test",
            "shortcut": "t",
            "arguments": [
                {
                    "name": "[CHANNEL MENTION/ID]",
                    "types": [ "channel" ],
                    "default": null
                }
            ],
            "execute": async (msg, guild, locale, [ channelId ]) => {
                let textChannel = null;
                if (channelId != null) {
                    textChannel = await msg.guild.channels.fetch(channelId);

                    if (textChannel == null || textChannel.type !== ChannelType.GuildText) {
                        await msg.reply(locale.Get("invalidChannel"));
                        return;
                    }
                }

                if (!await SendNitroBoostEmbed(msg.member, textChannel)) {
                    await msg.reply(locale.Get("noChannelSet"));
                }
            }
        }
    ]
});
