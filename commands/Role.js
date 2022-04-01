const { GuildMember } = require("discord.js");
const Sequelize = require("sequelize");
const { CreateCommand, Permissions, Database, Utils, DatabaseDefinitions } = require("../Command.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");

const _EMPTY_STRING_LIST = ";;";

/**
 * @param {String} str
 * @returns {String[]}
 */
const _StringListToArray = (str) => {
    if (str.length <= 2) return [ ]; // ";;" -> [ ]
    // ";Hello;World;" -> [ "", "Hello", "World", "" ] -> [ "Hello", "World" ]
    return str.split(";").slice(1, -1);
};

/**
 * @param {String[]} arr
 * @returns {String}
 */
const _ArrayToStringList = (arr) => {
    // [ "Hello", "World" ] -> ";Hello;World;"
    return arr.length === 0 ? _EMPTY_STRING_LIST : Utils.JoinArray([ "", ...arr, ""], ";");
};

/**
 * @param {String[]} roles
 * @param {GuildMember} member
 * @returns {Promise<Boolean>}
 */
const _CanManageRoles = async (roles, member) => {
    return roles.length > 0 && member.roles.cache.hasAny(
        ...(await Database.GetRows("role", {
            "guildId": member.guild.id,
            "manageableRoles": {
                [Sequelize.Op.and]: roles.map(val => {
                    return { [Sequelize.Op.like]: `%;${val};%` };
                })
            }
        })).map(val => val.roleId)
    );
};

module.exports = CreateCommand({
    "name": "role",
    "canExecute": async (msg, guild, locale) =>
        !await ReplyIfBlacklisted(locale, "role", msg, "inRoleAccessList", "isRoleAccessBlacklist"),
    "subcommands": [
        {
            "name": "managers",
            "permissions": Permissions.FLAGS.ADMINISTRATOR,
            "subcommands": [
                {
                    "name": "add",
                    "arguments": [
                        {
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ]
                        },
                        {
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ],
                            "isVariadic": true
                        }
                    ],
                    "execute": async (msg, guild, locale, [ targetId, rolesToAdd ]) => {
                        const targetRole = msg.guild.roles.resolve(targetId);
                        if (targetRole == null) {
                            await msg.reply(locale.Get("noTargetRole"));
                            return;
                        }

                        const managerRow = await Database.GetOrCreateRow("role", { "guildId": msg.guildId, "roleId": targetId });
                        const manageableRoles = _StringListToArray(managerRow.manageableRoles ?? "");

                        /** @type {String[]} */
                        const addedRoles = [ ];
                        for (let i = 0; i < rolesToAdd.length; i++) {
                            const roleId = rolesToAdd[i];
                            const role = msg.guild.roles.resolve(roleId);
                            if (role === null || manageableRoles.includes(roleId))
                                continue;

                            manageableRoles.push(roleId);
                            addedRoles.push(locale.GetCommonFormatted(
                                "roleListEntry", role.name, roleId
                            ));
                        }

                        if (addedRoles.length === 0) {
                            await msg.reply(locale.Get("noRoleAdded"));
                            return;
                        }

                        if (manageableRoles.length > DatabaseDefinitions.MAX_MANAGEABLE_ROLES) {
                            await msg.reply(locale.GetFormatted(
                                "maxManagersExceeded", DatabaseDefinitions.MAX_MANAGEABLE_ROLES, manageableRoles.length
                            ));
                            return;
                        }

                        await Database.SetRowAttr("role", {
                            "guildId": msg.guildId, "roleId": targetId
                        }, { "manageableRoles": _ArrayToStringList(manageableRoles) });

                        await msg.reply(Utils.JoinArray([
                            locale.Get("rolesAdded"), ...addedRoles
                        ], "\n"));
                    }
                },
                {
                    "name": "remove",
                    "arguments": [
                        {
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ]
                        },
                        {
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ],
                            "isVariadic": true
                        }
                    ],
                    "subcommands": [{
                        "name": "all",
                        "arguments": [{
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ]
                        }],
                        "execute": async (msg, guild, locale, [ targetId ]) => {
                            await Database.SetRowAttr("role",
                                { "guildId": msg.guildId, "roleId": targetId },
                                { "manageableRoles": null }
                            );
                            await msg.reply(locale.Get("allRolesRemoved"));
                        }
                    }],
                    "execute": async (msg, guild, locale, [ targetId, rolesToRemove ]) => {
                        const targetRole = msg.guild.roles.resolve(targetId);
                        if (targetRole == null) {
                            await msg.reply(locale.Get("noTargetRole"));
                            return;
                        }

                        const managerRow = await Database.GetOrCreateRow("role", { "guildId": msg.guildId, "roleId": targetId });
                        let manageableRoles = _StringListToArray(managerRow.manageableRoles ?? "");

                        /** @type {String[]} */
                        const removedRoles = [ ];
                        for (let i = 0; i < rolesToRemove.length; i++) {
                            const roleId = rolesToRemove[i];
                            const role = msg.guild.roles.resolve(roleId);
                            if (role === null)
                                continue;
                            
                            const newRoles = manageableRoles.filter(val => val !== roleId);
                            if (newRoles.length === manageableRoles.length)
                                continue;

                            manageableRoles = newRoles;
                            removedRoles.push(locale.GetCommonFormatted(
                                "roleListEntry", role.name, roleId
                            ));
                        }

                        if (removedRoles.length === 0) {
                            await msg.reply(locale.Get("noRoleRemoved"));
                            return;
                        }

                        await Database.SetRowAttr("role", {
                            "guildId": msg.guildId, "roleId": targetId
                        }, { "manageableRoles": manageableRoles.length === 0 ? null : _ArrayToStringList(manageableRoles) });

                        await msg.reply(Utils.JoinArray([
                            locale.Get("rolesRemoved"), ...removedRoles
                        ], "\n"));
                    }
                },
                {
                    "name": "clear",
                    "execute": async (msg, guild, locale) => {
                        await Database.SetRowAttr("role",
                            { "guildId": msg.guildId },
                            { "manageableRoles": null }
                        );
                        await msg.reply(locale.Get("allManagersRemoved"));
                    }
                }
            ]
        },
        {
            "name": "add",
            "arguments": [
                {
                    "name": "[USER MENTION/ID]",
                    "types": [ "user" ]
                },
                {
                    "name": "[ROLE MENTION/ID]",
                    "types": [ "role" ],
                    "isVariadic": true
                }
            ],
            "execute": async (msg, guild, locale, [ targetId, rolesToGive ]) => {
                if (rolesToGive.length === 0) {
                    await msg.reply(locale.Get("noRoleSpecified"));
                    return;
                }

                if (!(msg.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) || await _CanManageRoles(rolesToGive, msg.member))) {
                    await msg.reply(locale.Get("cantAddAll"));
                    return;
                }

                const targetMember = msg.guild.members.resolve(targetId);
                if (targetMember === null) {
                    await msg.reply(locale.Get("userNotFound"));
                    return;
                }

                try {
                    await targetMember.roles.add(rolesToGive, `Roles added by ${msg.member.id}`);
                    await msg.reply(locale.Get("rolesAdded"));
                } catch (error) {
                    await msg.reply(locale.Get("notEnoughPermissionsToAdd"));
                }
            }
        },
        {
            "name": "remove",
            "arguments": [
                {
                    "name": "[USER MENTION/ID]",
                    "types": [ "user" ]
                },
                {
                    "name": "[ROLE MENTION/ID]",
                    "types": [ "role" ],
                    "isVariadic": true
                }
            ],
            "execute": async (msg, guild, locale, [ targetId, rolesToRemove ]) => {
                if (rolesToRemove.length === 0) {
                    await msg.reply(locale.Get("noRoleSpecified"));
                    return;
                }

                if (!(msg.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) || await _CanManageRoles(rolesToRemove, msg.member))) {
                    await msg.reply(locale.Get("cantRemoveAll"));
                    return;
                }

                const targetMember = msg.guild.members.resolve(targetId);
                if (targetMember === null) {
                    await msg.reply(locale.Get("userNotFound"));
                    return;
                }

                try {
                    await targetMember.roles.remove(rolesToRemove, `Roles removed by ${msg.member.id}`);
                    await msg.reply(locale.Get("rolesRemoved"));
                } catch (error) {
                    await msg.reply(locale.Get("notEnoughPermissionsToRemove"));
                }
            }
        }
    ]
});
