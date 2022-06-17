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
 * @returns {Promise<String[]>}
 */
const _GetUnmanageableRoles = async (roles, member) => {
    if (roles.length === 0) return [ ];
    if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return [ ];

    // Get all managers owned by the user which also have at least
    //  one of the roles that it needs to manage
    const managerRows = await Database.GetRows("role", {
        "guildId": member.guild.id,
        "roleId": {
            [Sequelize.Op.or]: member.roles.cache.map((role, roleId) => {
                return { [Sequelize.Op.eq]: roleId };
            })
        },
        "manageableRoles": {
            [Sequelize.Op.or]: roles.map(val => {
                return { [Sequelize.Op.like]: `%;${val};%` };
            })
        }
    });

    // Get the list of all roles that aren't manageable by the user
    const disallowedRoles = roles.slice();
    for (const managerRow of managerRows) {
        // If no role is disallowed then we can stop
        if (disallowedRoles.length === 0) break;
        // For each currently disallowed role check if it is allowed
        //  by the current manager if so remove it from the list
        for (let i = disallowedRoles.length - 1; i >= 0; i--) {
            const isAllowed = managerRow.manageableRoles.includes(`;${disallowedRoles[i]};`);
            if (isAllowed) disallowedRoles.splice(i, 1);
        }
    }

    // If no role is disallowed then the user can manage all of them
    return disallowedRoles;
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
                            addedRoles.push(locale.GetSoftMention(
                                "Role", role.name, roleId, true
                            ));
                        }

                        if (addedRoles.length === 0) {
                            await msg.reply(locale.Get("noRoleAdded"));
                            return;
                        }

                        if (manageableRoles.length > DatabaseDefinitions.MAX_MANAGEABLE_ROLES) {
                            await msg.reply(locale.GetFormatted(
                                "maxManagersExceeded", {
                                    "max-count": DatabaseDefinitions.MAX_MANAGEABLE_ROLES,
                                    "total-count": manageableRoles.length
                                }
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
                            removedRoles.push(locale.GetSoftMention(
                                "Role", role.name, roleId, true
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
                    "name": "list",
                    "arguments": [
                        {
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ]
                        }
                    ],
                    "subcommands": [{
                        "name": "all",
                        "execute": async (msg, guild, locale) => {
                            const managerRows = await Database.GetRows("role", {
                                "guildId": msg.guildId,
                                "manageableRoles": {
                                    [Sequelize.Op.ne]: null
                                }
                            });

                            if (managerRows.length === 0) {
                                await msg.reply(locale.Get("noManager"));
                                return;
                            }

                            msg.reply(locale.Get("roleManagersList"));
                            for (const managerRow of managerRows) {
                                let response = "";
                                const managerRole = msg.guild.roles.resolve(managerRow.roleId);
                                response += locale.GetSoftMention(
                                    "Role", managerRole?.name, managerRow.roleId, false
                                ) + "\n";

                                for (const manageableRoleId of _StringListToArray(managerRow.manageableRoles)) {
                                    const manageableRole = msg.guild.roles.resolve(manageableRoleId);
                                    response += locale.GetSoftMention(
                                        "Role", manageableRole?.name, manageableRoleId, true
                                    ) + "\n";
                                }

                                await msg.channel.send(response);
                            }
                        }
                    }],
                    "execute": async (msg, guild, locale, [ managerId ]) => {
                        const managerRow = await Database.GetRow("role", { "guildId": msg.guildId, "roleId": managerId });

                        if (managerRow == null || managerRow.manageableRoles == null) {
                            await msg.reply(locale.Get("noManageable"));
                            return;
                        }

                        const managerRole = msg.guild.roles.resolve(managerRow.roleId);
                        let response = (
                            locale.Get("roleManageableList") + "\n" +
                            locale.GetSoftMention(
                                "Role", managerRole?.name, managerRow.roleId, false
                            ) + "\n"
                        );

                        for (const manageableRoleId of _StringListToArray(managerRow.manageableRoles)) {
                            const managerRole = msg.guild.roles.resolve(manageableRoleId);
                            response += locale.GetSoftMention(
                                "Role", managerRole?.name, manageableRoleId, true
                            ) + "\n";
                        }

                        await msg.reply(response);
                    }
                },
                {
                    "name": "clear",
                    "execute": async (msg, guild, locale) => {
                        await Database.SetRowsAttr("role",
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

                const unmanageableRoles = await _GetUnmanageableRoles(rolesToGive, msg.member);
                if (unmanageableRoles.length > 0) {
                    const unmanageableRolesList = Utils.JoinArray(
                        unmanageableRoles, "\n",
                        roleId => {
                            const role = msg.guild.roles.resolve(roleId);
                            return locale.GetSoftMention(
                                "Role", role?.name, roleId, true
                            );
                        }
                    );

                    await msg.reply(`${locale.Get("cantAddThese")}\n${unmanageableRolesList}`);
                    return;
                }

                const targetMember = msg.guild.members.resolve(targetId);
                if (targetMember === null) {
                    await msg.reply(locale.Get("userNotFound"));
                    return;
                }

                try {
                    await targetMember.roles.add(rolesToGive, `Roles added by ${msg.member.id}`);
                    await msg.reply(locale.GetFormatted("rolesAdded", {
                        "user": locale.GetSoftMention("User", targetMember.displayName, targetId)
                    }));
                } catch (error) {
                    await msg.reply(locale.GetFormatted("notEnoughPermissionsToAdd", {
                        "user": locale.GetSoftMention("User", targetMember.displayName, targetId)
                    }));
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

                const unmanageableRoles = await _GetUnmanageableRoles(rolesToRemove, msg.member);
                if (unmanageableRoles.length > 0) {
                    const unmanageableRolesList = Utils.JoinArray(
                        unmanageableRoles, "\n",
                        roleId => {
                            const role = msg.guild.roles.resolve(roleId);
                            return locale.GetSoftMention(
                                "Role", role?.name, roleId, true
                            );
                        }
                    );

                    await msg.reply(`${locale.Get("cantRemoveThese")}\n${unmanageableRolesList}`);
                    return;
                }

                const targetMember = msg.guild.members.resolve(targetId);
                if (targetMember === null) {
                    await msg.reply(locale.Get("userNotFound"));
                    return;
                }

                try {
                    await targetMember.roles.remove(rolesToRemove, `Roles removed by ${msg.member.id}`);
                    await msg.reply(locale.GetFormatted("rolesRemoved", {
                        "user": locale.GetSoftMention("User", targetMember.displayName, targetId)
                    }));
                } catch (error) {
                    await msg.reply(locale.GetFormatted("notEnoughPermissionsToRemove", {
                        "user": locale.GetSoftMention("User", targetMember.displayName, targetId)
                    }));
                }
            }
        }
    ]
});
