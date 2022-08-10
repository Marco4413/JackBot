const { GuildMember, Message, Permissions } = require("discord.js");
const Database = require("../../Database.js");
const { GetLocale } = require("../../Localization");
const Logger = require("../../Logger.js");
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

/** @type {Record<String, Boolean>} */
const _ACTIVE_GUILDS = { };

const _WaitForGuild = (guildId) => {
    if (!_ACTIVE_GUILDS[guildId])
        return new Promise(resolve => resolve());
    
    return new Promise(
        resolve => {
            const checker = () => {
                setTimeout(() => {
                    if (!_ACTIVE_GUILDS[guildId])
                        resolve();
                    else checker();
                }, 2.5e3);
            };
            checker();
        }
    );
};

/**
 * @param {GuildMember} member
 * @param {String} channelName
 * @param {Message?} msg
 */
const _CreateVoiceChannel = async (member, channelName, msg = null) => {
    const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });

    let locale;
    if (msg != null) {
        locale = GetLocale(guild.locale).GetCommandLocale([ "channel", "voice" ]);
    }

    const user = await Database.GetOrCreateRow("user", {
        "guildId": member.guild.id,
        "userId": member.id
    });

    let userChannel = await Utils.SafeFetch(member.guild.channels, user.privateVoiceChannelId);
    if (userChannel == null) {
        const parent = await Utils.SafeFetch(member.guild.channels, guild.privateChannelCategoryId);
        const permissionOverwrites = [ ];
        if (guild.privateChannelEveryoneTemplateRoleId != null) {
            const everyoneTemplateRole = await Utils.SafeFetch(
                member.guild.roles,
                guild.privateChannelEveryoneTemplateRoleId
            );
            
            if (everyoneTemplateRole != null) {
                permissionOverwrites.push({
                    "id": member.guild.roles.everyone.id,
                    "type": _OVERWRITE_TYPES_ROLE,
                    "allow": parent?.permissionsFor(everyoneTemplateRole) ?? everyoneTemplateRole.permissions
                });
            }
        }
    
        if (guild.privateChannelOwnerTemplateRoleId != null) {
            const ownerTemplateRole = await Utils.SafeFetch(
                member.guild.roles,
                guild.privateChannelOwnerTemplateRoleId
            );
    
            if (ownerTemplateRole != null) {
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
                        "reason": "Setting Voice Channel Permissions to Templates."
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

    if (member.voice.channelId != null)
        await member.voice.setChannel(userChannel, `${member.id} created a new Private Voice Channel.`);
};

/**
 * Creates a new Voice Channel for the specified Member
 * @param {GuildMember} member The Member to create the new Voice Channel for
 * @param {String} [channelName] The name of the new Channel
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null )
 */
const CreateVoiceChannel = async (member, channelName, msg = null) => {
    await _WaitForGuild(member.guild.id);
    _ACTIVE_GUILDS[member.guild.id] = true;
    try {
        await _CreateVoiceChannel(member, channelName, msg);
    } catch (error) {
        Logger.Error(error);
    }
    _ACTIVE_GUILDS[member.guild.id] = undefined;
};

/**
 * @param {GuildMember} member
 * @param {Boolean} scatterUsers
 * @param {Message?} msg
 */
const _DeleteVoiceChannel = async (member, scatterUsers, msg) => {
    let locale;
    if (msg != null) {
        const guild = await Database.GetOrCreateRow("guild", { "id": member.guild.id });
        locale = GetLocale(guild.locale).GetCommandLocale([ "channel", "voice" ]);
    }

    const user = await Database.GetOrCreateRow("user", {
        "guildId": member.guild.id,
        "userId": member.id
    });

    if (user.privateVoiceChannelId == null) {
        await msg?.reply(locale.Get("noChannel"));
        return;
    }

    const userChannel = await Utils.SafeFetch(member.guild.channels, user.privateVoiceChannelId);
    if (userChannel == null) {
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
            ch.isVoice() && ch.id !== userChannel.id && !ch.full &&
            ch.id !== guild.privateVoiceCreateChannelId &&
            ch.permissionsFor(member)
                .has(Permissions.FLAGS.CONNECT) &&
            ch.permissionsFor(member.guild.me)
                .has(Permissions.FLAGS.MOVE_MEMBERS)
        );

        // For each channel member
        for (const chMember of userChannel.members.values()) {
            // If it's still connected
            if (chMember.voice.channelId != null) {
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
 * Deletes the Private Voice Channel for the specified Member
 * @param {GuildMember} member The Member to delete the Voice Channel for
 * @param {Boolean} [scatterUsers] Whether or not users in the Channel should be scattered around the Guild
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null )
 */
const DeleteVoiceChannel = async (member, scatterUsers = true, msg = null) => {
    await _WaitForGuild(member.guild.id);
    _ACTIVE_GUILDS[member.guild.id] = true;
    try {
        await _DeleteVoiceChannel(member, scatterUsers, msg);
    } catch (error) {
        Logger.Error(error);
    }
    _ACTIVE_GUILDS[member.guild.id] = undefined;
};

/**
 * Creates a new Text Channel for the specified Member
 * @deprecated
 * @param {GuildMember} member The Member to create the new Text Channel for
 * @param {String} [channelName] The name of the new Channel
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null )
 */
const CreateTextChannel = async (member, channelName, msg = null) => {
    throw new Error("Usage of Deprecated Method.");
};

/**
 * Deletes the Private Text Channel for the specified Member
 * @deprecated
 * @param {GuildMember} member The Member to delete the Text Channel for
 * @param {Message?} [msg] The Message to reply to for verbose ( None if null )
 */
const DeleteTextChannel = async (member, msg = null) => {
    throw new Error("Usage of Deprecated Method.");
};

module.exports = {
    CreateVoiceChannel, DeleteVoiceChannel,
    CreateTextChannel, DeleteTextChannel
};
