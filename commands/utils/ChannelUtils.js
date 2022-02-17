const { GuildMember, Message, Permissions } = require("discord.js");
const Database = require("../../Database.js");
const { GetLocale } = require("../../Localization");
const Utils = require("../../Utils.js");

/**
 * @param {Permissions} perms
 * @returns {Object}
 */
const _PermissionToOverwrites = (perms) => {
    return perms.toArray().reduce((map, perm) => {
        map[perm] = true;
        return map;
    }, { });
};

const _OVERWRITE_TYPES_ROLE   = 0;
const _OVERWRITE_TYPES_MEMBER = 1;

/**
 * Creates a new Voice Channel for the specified Member
 * @param {GuildMember} member The Member to create the new Voice Channel for
 * @param {String} [channelName] The name of the new Channel
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null or undefined )
 */
const CreateVoiceChannel = async (member, channelName, msg) => {
    const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });

    let locale;
    if (msg != null) {
        locale = GetLocale(guild.locale).GetCommandLocale([ "channel", "voice" ]);
    }

    const user = await Database.GetOrCreateRow("user", {
        "guildId": member.guild.id,
        "userId": member.id
    });

    let userChannel = member.guild.channels.resolve(user.privateVoiceChannelId);
    if (userChannel === null || userChannel.deleted) {
        const parent = member.guild.channels.resolve(guild.privateChannelCategoryId);
        const permissionOverwrites = [ ];
        if (guild.privateChannelEveryoneTemplateRoleId !== null) {
            const everyoneTemplateRole = member.guild.roles.resolve(
                guild.privateChannelEveryoneTemplateRoleId
            );
            
            if (everyoneTemplateRole !== null) {
                permissionOverwrites.push({
                    "id": member.guild.roles.everyone.id,
                    "type": _OVERWRITE_TYPES_ROLE,
                    "allow": parent?.permissionsFor(everyoneTemplateRole) ?? everyoneTemplateRole.permissions
                });
            }
        }
    
        if (guild.privateChannelOwnerTemplateRoleId !== null) {
            const ownerTemplateRole = member.guild.roles.resolve(
                guild.privateChannelOwnerTemplateRoleId
            );
    
            if (ownerTemplateRole !== null) {
                permissionOverwrites.push({
                    "id": member.id,
                    "type": _OVERWRITE_TYPES_MEMBER,
                    "allow": parent?.permissionsFor(ownerTemplateRole) ?? ownerTemplateRole.permissions
                });
            }
        }

        userChannel = await member.guild.channels.create(
            channelName ?? `${member.displayName}'s Voice Channel`, {
                "type": "GUILD_VOICE",
                "parent": parent?.type === "GUILD_CATEGORY" ? parent : null
            }
        );

        if (permissionOverwrites.length > 0) {
            for (let i = 0; i < permissionOverwrites.length; i++) {
                const overwrites = permissionOverwrites[i];
                await userChannel.permissionOverwrites.edit(
                    overwrites.id,
                    _PermissionToOverwrites(overwrites.allow), {
                        "type": overwrites.type,
                        "reason": "Setting Text Channel Permissions to Templates."
                    }
                );
            }
        }

        await Database.SetRowAttr("user", {
            "guildId": member.guild.id,
            "userId": member.id
        }, { "privateVoiceChannelId": userChannel.id });

        await msg?.reply(locale.Get("created"));
    } else {
        await msg?.reply(locale.Get("alreadyCreated"));
    }

    if (member.voice.channelId !== null)
        await member.voice.setChannel(userChannel, `${member.id} created a new Private Voice Channel.`);
};

/**
 * Deletes the Private Voice Channel for the specified Member
 * @param {GuildMember} member The Member to delete the Voice Channel for
 * @param {Boolean} [scatterUsers] Whether or not users in the Channel should be scattered around the Guild
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null or undefined )
 */
const DeleteVoiceChannel = async (member, scatterUsers = true, msg) => {
    let locale;
    if (msg != null) {
        const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });
        locale = GetLocale(guild.locale).GetCommandLocale([ "channel", "voice" ]);
    }

    const user = await Database.GetOrCreateRow("user", {
        "guildId": member.guild.id,
        "userId": member.id
    });

    if (user.privateVoiceChannelId === null) {
        await msg?.reply(locale.Get("noChannel"));
        return;
    }

    const userChannel = member.guild.channels.resolve(user.privateVoiceChannelId);
    if (userChannel === null || userChannel.deleted) {
        await msg?.reply(locale.Get("noChannel"));
        return;
    }

    if (!userChannel.deletable) {
        await msg?.reply(locale.Get("cantDelete"));
        return;
    }
    
    if (scatterUsers) {
        const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });

        // Getting All Voice Channels of the Guild except the one that is being deleted
        const channels = (await member.guild.channels.fetch()).filter(ch =>
            ch.isVoice() && ch.id !== userChannel.id &&
            ch.id !== guild.privateVoiceCreateChannelId &&
            ch.permissionsFor(member.guild.me)
                .has(Permissions.FLAGS.MOVE_MEMBERS)
        );

        // For each channel member
        for (const chMember of userChannel.members.values()) {
            // If it's still connected
            if (chMember.voice.channelId !== null) {
                // Get a random channel that it can join
                const channel = channels.filter(
                    ch => ch.permissionsFor(chMember).has(Permissions.FLAGS.CONNECT | Permissions.FLAGS.VIEW_CHANNEL)
                ).random();
                // Set its channel to the one picked or disconnect if none
                await chMember.voice.setChannel(channel ?? null, `${chMember.id}'s Voice Channel was Deleted.`);
            }
        }
    }

    await userChannel.delete(`${member.id} asked to delete its Private Voice Channel.`);
    await Database.SetRowAttr("user", {
        "guildId": member.guild.id,
        "userId": member.id
    }, { "privateVoiceChannelId": null });
    await msg?.reply(locale.Get("deleted"));
};

/**
 * Creates a new Text Channel for the specified Member
 * @param {GuildMember} member The Member to create the new Text Channel for
 * @param {String} [channelName] The name of the new Channel
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null or undefined )
 */
const CreateTextChannel = async (member, channelName, msg) => {
    const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });

    let locale;
    if (msg != null) {
        locale = GetLocale(guild.locale).GetCommandLocale([ "channel", "text" ]);
    }

    const user = await Database.GetOrCreateRow("user", {
        "guildId": member.guild.id,
        "userId": member.id
    });

    let userChannel = member.guild.channels.resolve(user.privateTextChannelId);
    if (userChannel === null || userChannel.deleted) {
        const parent = member.guild.channels.resolve(guild.privateChannelCategoryId);
        const permissionOverwrites = [ ];
        if (guild.privateChannelEveryoneTemplateRoleId !== null) {
            const everyoneTemplateRole = member.guild.roles.resolve(
                guild.privateChannelEveryoneTemplateRoleId
            );
            
            if (everyoneTemplateRole !== null) {
                permissionOverwrites.push({
                    "id": member.guild.roles.everyone.id,
                    "type": _OVERWRITE_TYPES_ROLE,
                    "allow": parent?.permissionsFor(everyoneTemplateRole) ?? everyoneTemplateRole.permissions
                });
            }
        }
    
        if (guild.privateChannelOwnerTemplateRoleId !== null) {
            const ownerTemplateRole = member.guild.roles.resolve(
                guild.privateChannelOwnerTemplateRoleId
            );
    
            if (ownerTemplateRole !== null) {
                permissionOverwrites.push({
                    "id": member.id,
                    "type": _OVERWRITE_TYPES_MEMBER,
                    "allow": parent?.permissionsFor(ownerTemplateRole) ?? ownerTemplateRole.permissions
                });
            }
        }

        userChannel = await member.guild.channels.create(
            channelName ?? `${member.displayName}'s Text Channel`, {
                "type": "GUILD_TEXT",
                "parent": parent?.type === "GUILD_CATEGORY" ? parent : null
            }
        );

        if (permissionOverwrites.length > 0) {
            for (let i = 0; i < permissionOverwrites.length; i++) {
                const overwrites = permissionOverwrites[i];
                await userChannel.permissionOverwrites.edit(
                    overwrites.id,
                    _PermissionToOverwrites(overwrites.allow), {
                        "type": overwrites.type,
                        "reason": "Setting Text Channel Permissions to Templates."
                    }
                );
            }
        }

        await Database.SetRowAttr("user", {
            "guildId": member.guild.id,
            "userId": member.id
        }, { "privateTextChannelId": userChannel.id });

        await msg?.reply(locale.Get("created"));
        
        await userChannel.send(locale.GetFormatted(
            "welcome", Utils.MentionUser(member.id)
        ));
    } else {
        await msg?.reply(locale.Get("alreadyCreated"));
    }
};

/**
 * Deletes the Private Text Channel for the specified Member
 * @param {GuildMember} member The Member to delete the Text Channel for
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null or undefined )
 */
const DeleteTextChannel = async (member, msg) => {
    let locale;
    if (msg != null) {
        const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });
        locale = GetLocale(guild.locale).GetCommandLocale([ "channel", "text" ]);
    }

    const user = await Database.GetOrCreateRow("user", {
        "guildId": member.guild.id,
        "userId": member.id
    });

    if (user.privateTextChannelId === null) {
        await msg?.reply(locale.Get("noChannel"));
        return;
    }

    const channel = member.guild.channels.resolve(user.privateTextChannelId);
    if (channel === null || channel.deleted) {
        await msg?.reply(locale.Get("noChannel"));
        return;
    }

    if (!channel.deletable) {
        await msg?.reply(locale.Get("cantDelete"));
        return;
    }

    await channel.delete(`${member.id} asked to delete its Private Text Channel.`);
    await Database.SetRowAttr("user", {
        "guildId": member.guild.id,
        "userId": member.id
    }, { "privateTextChannelId": null });
    if (!(msg == null || msg.deleted)) await msg?.reply(locale.Get("deleted"));
};

module.exports = {
    CreateVoiceChannel, DeleteVoiceChannel,
    CreateTextChannel, DeleteTextChannel
};
