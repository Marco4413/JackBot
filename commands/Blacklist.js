const { GuildMember } = require("discord.js");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

// Don't know why but if I import DatabaseDefinitions from Command.js auto-completion doesn't work
/** @typedef {import("../DatabaseDefinitions.js").UserRow & import("../DatabaseDefinitions.js").RoleRow} UserRoleRows */

/**
 * Checks if the specified member is blacklisted based on the value at the key dbColumn
 * on both user and role Database Rows
 * @template {keyof UserRoleRows} T
 * @param {GuildMember} member The Member to check
 * @param {T} dbColumn The column that determines the blacklist status
 * @param {UserRoleRows[T]} [dbValue] The value the row should have for the member to be blacklisted
 * @returns {Boolean} Whether or not the specified member is blacklisted
 */
const IsBlacklisted = async (member, dbColumn, dbValue = true) => {
    if (await Database.GetRow("user", {
        "guildId": member.guild.id,
        "userId": member.id,
        [dbColumn]: dbValue
    }) !== undefined) return true;
    
    const blacklistedRoles = (await Database.GetRows("role", {
        "guildId": member.guild.id,
        [dbColumn]: dbValue
    })).map(role => role.roleId);
    
    return member.roles.cache.hasAny(...blacklistedRoles);
};

/**
 * @param {String} name
 * @param {String} shortcut
 * @param {keyof UserRoleRows} dbColumn
 * @returns {import("../Command.js").Command}
 */
const _CreateBlacklistCommand = (name, shortcut, dbColumn) => {
    return CreateCommand({
        name, shortcut,
        "subcommands": [
            {
                "name": "user",
                "shortcut": "u",
                "subcommands": [
                    {
                        "name": "list",
                        "shortcut": "l",
                        "execute": async (msg, guild, locale) => {
                            const blacklistedUsers = await Database.GetRows("user", { "guildId": msg.guildId, [dbColumn]: true });

                            /** @type {String[]} */
                            const blacklistedList = [ ];
                            for (let i = 0; i < blacklistedUsers.length; i++) {
                                const userId = blacklistedUsers[i].userId;
                                const user = msg.guild.members.resolve(userId);
                                blacklistedList.push(Utils.FormatString(
                                    locale.common.userListEntry,
                                    user?.displayName ?? locale.common.unknownUser, userId
                                ));
                            }
                            
                            if (blacklistedList.length === 0) {
                                await msg.reply(locale.command.currentUserBlacklistEmpty);
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                locale.command.currentUserBlacklist, ...blacklistedList
                            ], "\n"));
                        }
                    },
                    {
                        "name": "add",
                        "shortcut": "a",
                        "arguments": [{
                            "name": "[USER MENTION/ID]",
                            "types": [ "user" ],
                            "isVariadic": true
                        }],
                        "execute": async (msg, guild, locale, [ usersToBlacklist ]) => {
                            /** @type {String[]} */
                            const blacklistedList = [ ];
                            for (let i = 0; i < usersToBlacklist.length; i++) {
                                const userId = usersToBlacklist[i];
                                const user = msg.guild.members.resolve(userId);
                                if (user !== null) {
                                    const currentRow = await Database.GetOrCreateRow("user", { "guildId": msg.guildId, userId });
                                    if (currentRow[dbColumn]) continue;
                                    await Database.SetRowAttr("user", { "guildId": msg.guildId, userId }, {
                                        [dbColumn]: true
                                    });

                                    blacklistedList.push(Utils.FormatString(
                                        locale.common.userListEntry,
                                        user.displayName, user.id
                                    ));
                                }
                            }
                            
                            if (blacklistedList.length === 0) {
                                await msg.reply(locale.command.addedUserBlacklistEmpty);
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                locale.command.addedUserBlacklist, ...blacklistedList
                            ], "\n"));
                        }
                    },
                    {
                        "name": "remove",
                        "shortcut": "r",
                        "arguments": [{
                            "name": "[USER MENTION/ID]",
                            "types": [ "user" ],
                            "isVariadic": true
                        }],
                        "execute": async (msg, guild, locale, [ usersToBlacklist ]) => {
                            /** @type {String[]} */
                            const blacklistedList = [ ];
                            for (let i = 0; i < usersToBlacklist.length; i++) {
                                const userId = usersToBlacklist[i];

                                const currentRow = await Database.GetRow("user", { "guildId": msg.guildId, userId });
                                if (currentRow === undefined || !currentRow[dbColumn]) continue;
                                await Database.SetRowAttr("user", { "guildId": msg.guildId, userId }, {
                                    [dbColumn]: false
                                });
        
                                const user = msg.guild.members.resolve(userId);
                                blacklistedList.push(Utils.FormatString(
                                    locale.common.userListEntry,
                                    user?.displayName ?? locale.common.unknownUser, userId
                                ));
                            }
                            
                            if (blacklistedList.length === 0) {
                                await msg.reply(locale.command.removedUserBlacklistEmpty);
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                locale.command.removedUserBlacklist, ...blacklistedList
                            ], "\n"));
                        }
                    }
                ]
            },
            {
                "name": "role",
                "shortcut": "r",
                "subcommands": [
                    {
                        "name": "list",
                        "shortcut": "l",
                        "execute": async (msg, guild, locale) => {
                            const blacklistedRoles = await Database.GetRows("role", { "guildId": msg.guildId, [dbColumn]: true });

                            /** @type {String[]} */
                            const blacklistedList = [ ];
                            for (let i = 0; i < blacklistedRoles.length; i++) {
                                const roleId = blacklistedRoles[i].roleId;
                                const role = msg.guild.roles.resolve(roleId);
                                blacklistedList.push(Utils.FormatString(
                                    locale.common.roleListEntry,
                                    role?.name ?? locale.common.unknownRole, roleId
                                ));
                            }
                            
                            if (blacklistedList.length === 0) {
                                await msg.reply(locale.command.currentRoleBlacklistEmpty);
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                locale.command.currentRoleBlacklist, ...blacklistedList
                            ], "\n"));
                        }
                    },
                    {
                        "name": "add",
                        "shortcut": "a",
                        "arguments": [{
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ],
                            "isVariadic": true
                        }],
                        "execute": async (msg, guild, locale, [ rolesToBlacklist ]) => {
                            /** @type {String[]} */
                            const blacklistedList = [ ];
                            for (let i = 0; i < rolesToBlacklist.length; i++) {
                                const roleId = rolesToBlacklist[i];
                                const role = msg.guild.roles.resolve(roleId);
                                if (role !== null) {
                                    const currentRow = await Database.GetOrCreateRow("role", { "guildId": msg.guildId, roleId });
                                    if (currentRow[dbColumn]) continue;
                                    await Database.SetRowAttr("role", { "guildId": msg.guildId, roleId }, {
                                        [dbColumn]: true
                                    });

                                    blacklistedList.push(Utils.FormatString(
                                        locale.common.roleListEntry,
                                        role.name, role.id
                                    ));
                                }
                            }
                            
                            if (blacklistedList.length === 0) {
                                await msg.reply(locale.command.addedRoleBlacklistEmpty);
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                locale.command.addedRoleBlacklist, ...blacklistedList
                            ], "\n"));
                        }
                    },
                    {
                        "name": "remove",
                        "shortcut": "r",
                        "arguments": [{
                            "name": "[ROLE MENTION/ID]",
                            "types": [ "role" ],
                            "isVariadic": true
                        }],
                        "execute": async (msg, guild, locale, [ rolesToBlacklist ]) => {
                            /** @type {String[]} */
                            const blacklistedList = [ ];
                            for (let i = 0; i < rolesToBlacklist.length; i++) {
                                const roleId = rolesToBlacklist[i];

                                const currentRow = await Database.GetRow("role", { "guildId": msg.guildId, roleId });
                                if (currentRow === undefined || !currentRow[dbColumn]) continue;
                                await Database.SetRowAttr("role", { "guildId": msg.guildId, roleId }, {
                                    [dbColumn]: false
                                });
        
                                const role = msg.guild.roles.resolve(roleId);
                                blacklistedList.push(Utils.FormatString(
                                    locale.common.roleListEntry,
                                    role.name ?? locale.common.roleListEntry, roleId
                                ));
                            }
                            
                            if (blacklistedList.length === 0) {
                                await msg.reply(locale.command.removedRoleBlacklistEmpty);
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                locale.command.removedRoleBlacklist, ...blacklistedList
                            ], "\n"));
                        }
                    }
                ]
            }
        ]
    });
};

module.exports = CreateCommand({
    "name": "blacklist",
    "shortcut": "bl",
    "permissions": Permissions.FLAGS.MANAGE_ROLES,
    "subcommands": [
        _CreateBlacklistCommand("sound", "s", "soundBlacklist")
    ]
});

module.exports.IsBlacklisted = IsBlacklisted;
