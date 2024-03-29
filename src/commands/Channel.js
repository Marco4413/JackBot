const { ChannelType } = require("discord.js");
const Sequelize = require("sequelize");
const { Client } = require("../Client.js");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");
const Logger = require("../Logger.js");
const { CreateInterval } = require("../Timing.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");
const { CreateVoiceChannel, DeleteVoiceChannel } = require("./utils/ChannelUtils.js");

const _CHANNEL_SWEEP_INTERVAL = Utils.GetEnvVariable(
    "CHANNEL_SWEEP_INTERVAL", Utils.AnyToNumber, 900e3, Logger.Warn
);

const _CHANNEL_MAX_INACTIVITY = Utils.GetEnvVariable(
    "CHANNEL_MAX_INACTIVITY", Utils.AnyToNumber, 1700e3, Logger.Warn
);

const _CHANNEL_JUST_CREATED_THRESHOLD = Utils.GetEnvVariable(
    "CHANNEL_JUST_CREATED_THRESHOLD", Utils.AnyToNumber, 120e3, Logger.Warn
);

CreateInterval(async id => {
    const usersWithChannels = await Database.GetRows("user", {
        [Sequelize.Op.or]: [ {
            "privateTextChannelId": {
                [Sequelize.Op.ne]: null
            }
        }, {
            "privateVoiceChannelId": {
                [Sequelize.Op.ne]: null
            }
        } ]
    });

    Logger.Debug("Performing Channel Sweep...");
    let sweepedChannels = 0;

    const dateNow = Date.now();
    for (const user of usersWithChannels) {
        const guild = await Utils.SafeFetch(Client.guilds, user.guildId);
        if (guild == null) continue;

        let textChannelDeleted  = false;
        let voiceChannelDeleted = false;

        if (user.privateTextChannelId != null) {
            const textChannel = await Utils.SafeFetch(guild.channels, user.privateTextChannelId);
            if (textChannel == null) {
                textChannelDeleted = true;
            } else if ((
                // If the last message was sent before the max inactivity time
                //  or if none the channel wasn't just created then ...
                textChannel.lastMessage == null ?
                    (dateNow - textChannel.createdTimestamp) >= _CHANNEL_JUST_CREATED_THRESHOLD :
                    (dateNow - textChannel.lastMessage.createdTimestamp) >= _CHANNEL_MAX_INACTIVITY
            ) && textChannel.deletable) {
                await textChannel.delete("Text Channel Inactivity.");
                textChannelDeleted = true;
                sweepedChannels++;
            }
        }

        if (user.privateVoiceChannelId != null) {
            const voiceChannel = await Utils.SafeFetch(guild.channels, user.privateVoiceChannelId);
            if (voiceChannel == null) {
                voiceChannelDeleted = true;
            } else if (
                voiceChannel.members.size === 0 &&
                (dateNow - voiceChannel.createdTimestamp) >= _CHANNEL_JUST_CREATED_THRESHOLD &&
                voiceChannel.deletable
            ) {
                await voiceChannel.delete("Voice Channel Inactivity.");
                voiceChannelDeleted = true;
                sweepedChannels++;
            }
        }

        if (textChannelDeleted || voiceChannelDeleted) {
            await Database.SetRowAttr("user", {
                "guildId": user.guildId, "userId": user.userId
            }, {
                "privateTextChannelId":  textChannelDeleted  ? null : undefined,
                "privateVoiceChannelId": voiceChannelDeleted ? null : undefined
            });
        }
    }

    Logger.Debug(`Sweeped ${sweepedChannels} Channels!`);
}, _CHANNEL_SWEEP_INTERVAL);

module.exports = CreateCommand({
    "name": "channel",
    "shortcut": "ch",
    "permissions": Permissions.Flags.ViewChannel,
    "canExecute": async (msg, guild, locale) =>
        !await ReplyIfBlacklisted(locale, "channel", msg, "inChannelAccessList", "isChannelAccessBlacklist"),
    "subcommands": [
        {
            "name": "text",
            "shortcut": "t",
            /* "subcommands": [
                {
                    "name": "create",
                    "shortcut": "c",
                    "execute": async (msg, guild, locale, [ channelName ]) => {
                        await CreateTextChannel(msg.member, channelName.length > 0 ? channelName : undefined, msg);
                    }
                },
                {
                    "name": "delete",
                    "shortcut": "d",
                    "execute": async (msg, guild, locale) => {
                        await DeleteTextChannel(msg.member, msg);
                    }
                }
            ] */
            "execute": async (msg, guild, locale) => {
                await msg.reply(locale.Get("featureDisabled"));
            }
        },
        {
            "name": "voice",
            "shortcut": "v",
            "subcommands": [
                {
                    "name": "create",
                    "shortcut": "c",
                    "execute": async (msg, guild, locale, [ channelName ]) => {
                        await CreateVoiceChannel(msg.member, channelName.length > 0 ? channelName : undefined, msg);
                    }
                },
                {
                    "name": "delete",
                    "shortcut": "d",
                    "execute": async (msg, guild, locale) => {
                        await DeleteVoiceChannel(msg.member, true, msg);
                    }
                }
            ]
        },
        {
            "name": "category",
            "shortcut": "c",
            "permissions": Permissions.Flags.ManageChannels,
            "subcommands": [{
                "name": "set",
                "shortcut": "s",
                "arguments": [{
                    "name": "[CATEGORY]",
                    "types": [ "channel" ],
                    "default": null
                }],
                "execute": async (msg, guild, locale, [ categoryId ]) => {
                    if (categoryId == null) {
                        await Database.SetRowAttr("guild", {
                            "id": msg.guildId
                        }, { "privateChannelCategoryId": null });
                        await msg.reply(locale.Get("categoryRemoved"));
                        return;
                    }

                    const category = await Utils.SafeFetch(msg.guild.channels, categoryId);
                    if (category == null || category.type !== ChannelType.GuildCategory) {
                        await msg.reply(locale.Get("invalidCategory"));
                        return;
                    }

                    await Database.SetRowAttr("guild", {
                        "id": msg.guildId
                    }, { "privateChannelCategoryId": categoryId });
                    await msg.reply(locale.Get("categorySet"));
                }
            }],
            "execute": async (msg, guild, locale) => {
                if (guild.privateChannelCategoryId == null) {
                    await msg.reply(locale.Get("noCategory"));
                    return;
                }

                const category = await Utils.SafeFetch(msg.guild.channels, guild.privateChannelCategoryId);
                await msg.reply(locale.GetFormatted(
                    "currentCategory", {
                        "category": locale.GetSoftMention(
                            "Channel", category?.name, guild.privateChannelCategoryId
                        )
                    }
                ));
            }
        },
        {
            "name": "voice-creation-channel",
            "shortcut": "vcc",
            "permissions": Permissions.Flags.ManageChannels,
            "subcommands": [{
                "name": "set",
                "shortcut": "s",
                "arguments": [{
                    "name": "[VOICE CHANNEL]",
                    "types": [ "channel" ],
                    "default": null
                }],
                "execute": async (msg, guild, locale, [ channelId ]) => {
                    if (channelId == null) {
                        await Database.SetRowAttr("guild", {
                            "id": msg.guildId
                        }, { "privateVoiceCreateChannelId": null });
                        await msg.reply(locale.Get("channelRemoved"));
                        return;
                    }

                    const voiceChannel = await Utils.SafeFetch(msg.guild.channels, channelId);
                    if (voiceChannel == null || voiceChannel.type !== ChannelType.GuildVoice) {
                        await msg.reply(locale.Get("invalidChannel"));
                        return;
                    }

                    await Database.SetRowAttr("guild", {
                        "id": msg.guildId
                    }, { "privateVoiceCreateChannelId": channelId });
                    await msg.reply(locale.Get("channelSet"));
                }
            }],
            "execute": async (msg, guild, locale) => {
                if (guild.privateVoiceCreateChannelId == null) {
                    await msg.reply(locale.Get("noChannel"));
                    return;
                }

                const voiceChannel = await Utils.SafeFetch(msg.guild.channels, guild.privateVoiceCreateChannelId);
                await msg.reply(locale.GetFormatted(
                    "currentChannel", {
                        "channel": locale.GetSoftMention(
                            "Channel", voiceChannel?.name, guild.privateVoiceCreateChannelId
                        )
                    }
                ));
            }
        },
        {
            "name": "template-role",
            "shortcut": "tr",
            "permissions": Permissions.Flags.ManageRoles,
            "subcommands": [
                {
                    "name": "everyone",
                    "shortcut": "e",
                    "subcommands": [{
                        "name": "set",
                        "shortcut": "s",
                        "arguments": [{
                            "name": "[EVERYONE ROLE]",
                            "types": [ "role" ],
                            "default": null
                        }],
                        "execute": async (msg, guild, locale, [ templateRoleId ]) => {
                            if (templateRoleId == null) {
                                await Database.SetRowAttr("guild", {
                                    "id": msg.guildId
                                }, { "privateChannelEveryoneTemplateRoleId": null });
                                await msg.reply(locale.Get("everyoneRemoved"));
                                return;
                            }

                            const templateRole = await Utils.SafeFetch(msg.guild.roles, templateRoleId);
                            if (templateRole == null) {
                                await msg.reply(locale.Get("invalidRole"));
                                return;
                            } else if (templateRole.comparePositionTo(msg.member.roles.highest) >= 0) {
                                await msg.reply(locale.Get("higherRole"));
                                return;
                            } else if (!msg.member.permissions.has(templateRole.permissions, true)) {
                                await msg.reply(locale.Get("lowerRolePerms"));
                                return;
                            }
    
                            await Database.SetRowAttr("guild", {
                                "id": msg.guildId
                            }, { "privateChannelEveryoneTemplateRoleId": templateRoleId });
                            await msg.reply(locale.Get("everyoneSet"));
                        }
                    }],
                    "execute": async (msg, guild, locale) => {
                        if (guild.privateChannelEveryoneTemplateRoleId == null) {
                            await msg.reply(locale.Get("noEveryone"));
                            return;
                        }

                        const templateRole = await Utils.SafeFetch(msg.guild.roles, guild.privateChannelEveryoneTemplateRoleId);
                        await msg.reply(locale.GetFormatted(
                            "currentEveryone", {
                                "role": locale.GetSoftMention(
                                    "Role", templateRole?.name, guild.privateChannelEveryoneTemplateRoleId
                                )
                            }
                        ));
                    }
                },
                {
                    "name": "owner",
                    "shortcut": "o",
                    "subcommands": [{
                        "name": "set",
                        "shortcut": "s",
                        "arguments": [{
                            "name": "[OWNER ROLE]",
                            "types": [ "role" ],
                            "default": null
                        }],
                        "execute": async (msg, guild, locale, [ templateRoleId ]) => {
                            if (templateRoleId == null) {
                                await Database.SetRowAttr("guild", {
                                    "id": msg.guildId
                                }, { "privateChannelOwnerTemplateRoleId": null });
                                await msg.reply(locale.Get("ownerRemoved"));
                                return;
                            }

                            const templateRole = await Utils.SafeFetch(msg.guild.roles, templateRoleId);
                            if (templateRole == null) {
                                await msg.reply(locale.Get("invalidRole"));
                                return;
                            } else if (templateRole.comparePositionTo(msg.member.roles.highest) >= 0) {
                                await msg.reply(locale.Get("higherRole"));
                                return;
                            } else if (!msg.member.permissions.has(templateRole.permissions, true)) {
                                await msg.reply(locale.Get("lowerRolePerms"));
                                return;
                            }
    
                            await Database.SetRowAttr("guild", {
                                "id": msg.guildId
                            }, { "privateChannelOwnerTemplateRoleId": templateRoleId });
                            await msg.reply(locale.Get("ownerSet"));
                        }
                    }],
                    "execute": async (msg, guild, locale) => {
                        if (guild.privateChannelOwnerTemplateRoleId == null) {
                            await msg.reply(locale.Get("noOwner"));
                            return;
                        }

                        const templateRole = await Utils.SafeFetch(msg.guild.roles, guild.privateChannelOwnerTemplateRoleId);
                        await msg.reply(locale.GetFormatted(
                            "currentOwner", {
                                "role": locale.GetSoftMention(
                                    "Role", templateRole?.name, guild.privateChannelOwnerTemplateRoleId
                                )
                            }
                        ));
                    }
                }
            ]
        }
    ]
});
