const { GuildMember, GuildChannel } = require("discord.js");
const Sequelize = require("sequelize");
const { Client } = require("../Client.js");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");
const { Locale } = require("../Localization.js");
const Logger = require("../Logger.js");
const { CreateInterval } = require("../Timing.js");

/**
 * @param {"GUILD_TEXT"|"GUILD_VOICE"} channelType
 * @param {keyof import("../DatabaseDefinitions.js").UserRow} channelIdRow
 * @param {String} [defaultChannelName]
 * @param {(member: GuildMember, channel: GuildChannel, locale: Locale) => Promise<Void>} [onCreate]
 * @param {(member: GuildMember, channel: GuildChannel, locale: Locale) => Promise<Void>} [onDelete]
 * @returns {import("../Command.js").Command[]}
 */
const _GetChannelSubcommands = (channelType, channelIdRow, defaultChannelName = "{0}'s Channel", onCreate, onDelete) => {
    return [
        {
            "name": "create",
            "shortcut": "c",
            "execute": async (msg, guild, locale, args) => {
                const user = await Database.GetOrCreateRow("user", {
                    "guildId": msg.guildId,
                    "userId": msg.member.id
                });

                if (user[channelIdRow] !== null) {
                    const channel = msg.guild.channels.resolve(user[channelIdRow]);
                    if (channel !== null) {
                        if (!channel.deletable) {
                            await msg.reply(locale.Get("cantDelete"));
                            return;
                        }
    
                        if (onDelete !== undefined)
                            await onDelete(msg.member, channel, locale);
                        await channel.delete(`${msg.member.id} asked for a new ${channelType} Channel.`);
                    }
                }
                
                /** @type {Permissions} */
                let everyonePermissions = msg.guild.roles.everyone.permissions;
                if (guild.privateChannelEveryoneTemplateRoleId !== null) {
                    const everyoneTemplateRole = msg.guild.roles.resolve(
                        guild.privateChannelEveryoneTemplateRoleId
                    );
                    
                    if (everyoneTemplateRole !== null)
                        everyonePermissions = everyoneTemplateRole.permissions;
                }

                /** @type {Permissions} */
                let ownerPermissions = msg.guild.roles.everyone.permissions;
                if (guild.privateChannelOwnerTemplateRoleId !== null) {
                    const ownerTemplateRole = msg.guild.roles.resolve(
                        guild.privateChannelOwnerTemplateRoleId
                    );
                    
                    if (ownerTemplateRole !== null)
                        ownerPermissions = ownerTemplateRole.permissions;
                }

                const channelName = args.length === 0 ?
                    Utils.FormatString(defaultChannelName, msg.member.displayName) :
                    Utils.JoinArray(args, " ");
                
                const parent = msg.guild.channels.resolve(guild.privateChannelCategoryId);
                const channel = await msg.guild.channels.create(channelName, {
                    "type": channelType,
                    "parent": parent?.type === "GUILD_CATEGORY" ? parent : null,
                    "permissionOverwrites": [
                        {
                            "id": msg.guild.roles.everyone.id,
                            "type": "role",
                            "allow": everyonePermissions
                        },
                        {
                            "id": msg.member.id,
                            "type": "member",
                            "allow": ownerPermissions
                        }
                    ]
                });

                await Database.SetRowAttr("user", {
                    "guildId": msg.guildId,
                    "userId": msg.member.id
                }, { [channelIdRow]: channel.id });

                if (!msg.deleted) await msg.reply(locale.Get("created"));
                if (onCreate !== undefined)
                    await onCreate(msg.member, channel, locale);
            }
        },
        {
            "name": "delete",
            "shortcut": "d",
            "execute": async (msg, guild, locale) => {
                const user = await Database.GetOrCreateRow("user", {
                    "guildId": msg.guildId,
                    "userId": msg.member.id
                });

                if (user[channelIdRow] === null) {
                    await msg.reply(locale.Get("noChannel"));
                    return;
                }

                const channel = msg.guild.channels.resolve(user[channelIdRow]);
                if (channel === null) {
                    await msg.reply(locale.Get("noChannel"));
                } else if (!channel.deletable) {
                    await msg.reply(locale.Get("cantDelete"));
                    return;
                } else {
                    await msg.reply(locale.Get("deleted"));
                    if (onDelete !== undefined)
                        await onDelete(msg.member, channel, locale);
                    await channel.delete(`${msg.member.id} asked to delete his ${channelType} Channel.`);
                }

                await Database.SetRowAttr("user", {
                    "guildId": msg.guildId,
                    "userId": msg.member.id
                }, { [channelIdRow]: null });
            }
        }
    ];
};

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
        const guild = Client.guilds.resolve(user.guildId);
        if (guild === null) continue;

        let textChannelDeleted  = false;
        let voiceChannelDeleted = false;

        if (user.privateTextChannelId !== null) {
            const textChannel = guild.channels.resolve(user.privateTextChannelId);
            if (textChannel !== null && (
                // If the last message was sent before the max inactivity time
                //  or if none the channel wasn't just created then ...
                textChannel.lastMessage === null ?
                    (dateNow - textChannel.createdTimestamp) >= _CHANNEL_JUST_CREATED_THRESHOLD :
                    (dateNow - textChannel.lastMessage.createdTimestamp) >= _CHANNEL_MAX_INACTIVITY
            ) && textChannel.deletable
            ) {
                await textChannel.delete("Text Channel Inactivity.");
                textChannelDeleted = true;
                sweepedChannels++;
            }
        }

        if (user.privateVoiceChannelId !== null) {
            const voiceChannel = guild.channels.resolve(user.privateVoiceChannelId);
            if (voiceChannel !== null &&
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
    "permissions": Permissions.FLAGS.VIEW_CHANNEL,
    "subcommands": [
        {
            "name": "text",
            "shortcut": "t",
            "subcommands": _GetChannelSubcommands(
                "GUILD_TEXT", "privateTextChannelId", "{0}-text-channel",
                async (member, channel, locale) => {
                    await channel.send(locale.GetFormatted(
                        "welcome", Utils.MentionUser(member.id)
                    ));
                }
            )
        },
        {
            "name": "voice",
            "shortcut": "v",
            "subcommands": _GetChannelSubcommands(
                "GUILD_VOICE", "privateVoiceChannelId", "{0}'s Voice Channel",
                async (member, channel) => {
                    if (member.voice.channelId !== null) {
                        await member.voice.setChannel(channel, `${member.id} created a new private GUILD_VOICE Channel.`);
                    }
                },
                async (member, channel) => {
                    // Getting All Voice Channels of the Guild except the one that is being deleted
                    const channels = (await member.guild.channels.fetch())
                        .filter(ch => ch.isVoice() && ch.id !== channel.id);

                    // For each channel member
                    for (const member of channel.members.values()) {
                        // If it's still connected
                        if (member.voice.channelId !== null) {
                            // Get a random channel that it can join
                            const channel = channels.filter(
                                ch => ch.permissionsFor(member).has(Permissions.FLAGS.CONNECT)
                            ).random();
                            // Set its channel to the one picked or disconnect if none
                            await member.voice.setChannel(channel ?? null, "GUILD_VOICE Channel Deleted.");
                        }
                    }
                }
            )
        },
        {
            "name": "category",
            "shortcut": "c",
            "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
            "subcommands": [{
                "name": "set",
                "shortcut": "s",
                "arguments": [{
                    "name": "[CATEGORY]",
                    "types": [ "channel" ],
                    "default": null
                }],
                "execute": async (msg, guild, locale, [ categoryId ]) => {
                    if (categoryId === null) {
                        await Database.SetRowAttr("guild", {
                            "id": msg.guildId
                        }, { "privateChannelCategoryId": null });
                        await msg.reply(locale.Get("categoryRemoved"));
                        return;
                    }

                    const category = msg.guild.channels.resolve(categoryId);
                    if (category === null || category.type !== "GUILD_CATEGORY") {
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
                if (guild.privateChannelCategoryId === null) {
                    await msg.reply(locale.Get("noCategory"));
                    return;
                }

                const category = msg.guild.channels.resolve(guild.privateChannelCategoryId);
                await msg.reply(locale.GetFormatted(
                    "currentCategory", locale.GetCommonFormatted(
                        "softMention",
                        category?.name ?? locale.GetCommon("unknownChannel"),
                        guild.privateChannelCategoryId
                    )
                ));
            }
        },
        {
            "name": "voice-creation-channel",
            "shortcut": "vcc",
            "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
            "subcommands": [{
                "name": "set",
                "shortcut": "s",
                "arguments": [{
                    "name": "[VOICE CHANNEL]",
                    "types": [ "channel" ],
                    "default": null
                }],
                "execute": async (msg, guild, locale, [ channelId ]) => {
                    if (channelId === null) {
                        await Database.SetRowAttr("guild", {
                            "id": msg.guildId
                        }, { "privateVoiceCreateChannelId": null });
                        await msg.reply(locale.Get("channelRemoved"));
                        return;
                    }

                    const voiceChannel = msg.guild.channels.resolve(channelId);
                    if (voiceChannel === null || voiceChannel.type !== "GUILD_VOICE") {
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
                if (guild.privateVoiceCreateChannelId === null) {
                    await msg.reply(locale.Get("noChannel"));
                    return;
                }

                const voiceChannel = msg.guild.channels.resolve(guild.privateVoiceCreateChannelId);
                await msg.reply(locale.GetFormatted(
                    "currentChannel", locale.GetCommonFormatted(
                        "softMention",
                        voiceChannel?.name ?? locale.GetCommon("unknownChannel"),
                        guild.privateVoiceCreateChannelId
                    )
                ));
            }
        },
        {
            "name": "template-role",
            "shortcut": "tr",
            "permissions": Permissions.FLAGS.MANAGE_ROLES,
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
                            if (templateRoleId === null) {
                                await Database.SetRowAttr("guild", {
                                    "id": msg.guildId
                                }, { "privateChannelEveryoneTemplateRoleId": null });
                                await msg.reply(locale.Get("everyoneRemoved"));
                                return;
                            }

                            const templateRole = msg.guild.roles.resolve(templateRoleId);
                            if (templateRole === null) {
                                await msg.reply(locale.Get("invalidRole"));
                                return;
                            } else if (templateRole.comparePositionTo(msg.member.roles.highest) <= 0) {
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
                    "execute": async (msg, guild, locale, [ templateRoleId ]) => {
                        if (guild.privateChannelEveryoneTemplateRoleId === null) {
                            await msg.reply(locale.Get("noEveryone"));
                            return;
                        }

                        const templateRole = msg.guild.roles.resolve(guild.privateChannelEveryoneTemplateRoleId);
                        await msg.reply(locale.GetFormatted(
                            "currentEveryone", locale.GetCommonFormatted(
                                "softMention",
                                templateRole?.name ?? locale.GetCommon("unknownRole"),
                                guild.privateChannelEveryoneTemplateRoleId
                            )
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
                            if (templateRoleId === null) {
                                await Database.SetRowAttr("guild", {
                                    "id": msg.guildId
                                }, { "privateChannelOwnerTemplateRoleId": null });
                                await msg.reply(locale.Get("ownerRemoved"));
                                return;
                            }

                            const templateRole = msg.guild.roles.resolve(templateRoleId);
                            if (templateRole === null) {
                                await msg.reply(locale.Get("invalidRole"));
                                return;
                            } else if (templateRole.comparePositionTo(msg.member.roles.highest) <= 0) {
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
                        if (guild.privateChannelOwnerTemplateRoleId === null) {
                            await msg.reply(locale.Get("noOwner"));
                            return;
                        }

                        const templateRole = msg.guild.roles.resolve(guild.privateChannelOwnerTemplateRoleId);
                        await msg.reply(locale.GetFormatted(
                            "currentOwner", locale.GetCommonFormatted(
                                "softMention",
                                templateRole?.name ?? locale.GetCommon("unknownRole"),
                                guild.privateChannelOwnerTemplateRoleId
                            )
                        ));
                    }
                }
            ]
        }
    ]
});
