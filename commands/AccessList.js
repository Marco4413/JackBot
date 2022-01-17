const { GuildMember } = require("discord.js");
const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

// Don't know why but if I import DatabaseDefinitions from Command.js auto-completion doesn't work
/** @typedef {import("../DatabaseDefinitions.js").UserRow & import("../DatabaseDefinitions.js").RoleRow} UserRoleRows */
/** @typedef {import("../DatabaseDefinitions.js").GuildRow} GuildRow */

/**
 * Checks if the specified member is blacklisted based on the value at the key dbColumn
 * on both user and role Database Rows
 * @template {keyof UserRoleRows} T
 * @param {GuildMember} member The Member to check
 * @param {T} dbInListColumn The column that specifies if the Member is in the Access List
 * @param {keyof GuildRow} dbIsBlacklistColumn The column that specifies if the Access List is a Blacklist
 * @returns {Boolean} Whether or not the specified member is blacklisted
 */
const IsBlacklisted = async (member, dbInListColumn, dbIsBlacklistColumn) => {
    const isBlacklist = (await Database.GetOrCreateRow("guild", {
        "id": member.guild.id
    }))[dbIsBlacklistColumn];

    const isUserInList = await Database.GetRow("user", {
        "guildId": member.guild.id,
        "userId": member.id,
        [dbInListColumn]: true
    }) !== undefined;
    if (isBlacklist && isUserInList) return true;
    
    const isRoleInList = member.roles.cache.hasAny(
        ...(await Database.GetRows("role", {
            "guildId": member.guild.id,
            [dbInListColumn]: true
        })).map(role => role.roleId)
    );
    if (isBlacklist) return isRoleInList;

    return !(isUserInList || isRoleInList);
};

/**
 * @param {String} name
 * @param {String} shortcut
 * @param {keyof UserRoleRows} dbInListColumn
 * @param {keyof GuildRow} dbIsBlacklistColumn
 * @returns {import("../Command.js").Command}
 */
const _CreateBlacklistCommand = (name, shortcut, dbInListColumn, dbIsBlacklistColumn) => {
    const _GetListTypeLocale = (locale, guild) =>
        guild[dbIsBlacklistColumn] ? locale.command.blacklist : locale.command.whitelist;

    const _GetFormattedListLocale = (locale, commandLocaleKey, guild) => {
        return Utils.FormatString(
            locale.command[commandLocaleKey],
            _GetListTypeLocale(locale, guild)
        );
    };

    return CreateCommand({
        name, shortcut,
        "subcommands": [
            {
                "name": "type",
                "shortcut": "t",
                "subcommands": [
                    {
                        "name": "set",
                        "shortcut": "s",
                        "arguments": [
                            {
                                "name": "[BLACKLIST/WHITELIST]",
                                "types": [ "string" ]
                            }
                        ],
                        "execute": async (msg, guild, locale, [ listType ]) => {
                            let isBlacklist;
                            const lowerListType = listType.toLowerCase();
                            switch (lowerListType) {
                            case "blacklist":
                                isBlacklist = true;
                                break;
                            case "whitelist":
                                isBlacklist = false;
                                break;
                            default:
                                await msg.reply(locale.command.invalidListType);
                                return;
                            }

                            const newGuild = await Database.SetRowAttr("guild", { "id": msg.guildId }, {
                                [dbIsBlacklistColumn]: isBlacklist
                            });

                            await msg.reply(Utils.FormatString(
                                locale.command.setListType,
                                _GetListTypeLocale(locale, newGuild)
                            ));
                        }
                    }
                ],
                "execute": async (msg, guild, locale) => {
                    await msg.reply(Utils.FormatString(
                        locale.command.currentListType,
                        _GetListTypeLocale(locale, guild)
                    ));
                }
            },
            {
                "name": "user",
                "shortcut": "u",
                "subcommands": [
                    {
                        "name": "clear",
                        "shortcut": "c",
                        "execute": async (msg, guild, locale) => {
                            const rows = await Database.SetRowsAttr("user", {
                                [dbInListColumn]: true
                            }, {
                                [dbInListColumn]: false
                            });

                            await msg.reply(Utils.FormatString(
                                locale.command.clearedUserList,
                                _GetListTypeLocale(locale, guild), rows.length
                            ));
                        }
                    },
                    {
                        "name": "list",
                        "shortcut": "l",
                        "execute": async (msg, guild, locale) => {
                            const usersInList = await Database.GetRows("user", { "guildId": msg.guildId, [dbInListColumn]: true });

                            /** @type {String[]} */
                            const accessList = [ ];
                            for (let i = 0; i < usersInList.length; i++) {
                                const userId = usersInList[i].userId;
                                const user = msg.guild.members.resolve(userId);
                                accessList.push(Utils.FormatString(
                                    locale.common.userListEntry,
                                    user?.displayName ?? locale.common.unknownUser, userId
                                ));
                            }
                            
                            if (accessList.length === 0) {
                                await msg.reply(
                                    _GetFormattedListLocale(locale, "currentUserListEmpty", guild)
                                );
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                _GetFormattedListLocale(locale, "currentUserList", guild),
                                ...accessList
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
                        "execute": async (msg, guild, locale, [ usersToAdd ]) => {
                            /** @type {String[]} */
                            const addedToList = [ ];
                            for (let i = 0; i < usersToAdd.length; i++) {
                                const userId = usersToAdd[i];
                                const user = msg.guild.members.resolve(userId);
                                if (user !== null) {
                                    const currentRow = await Database.GetOrCreateRow("user", { "guildId": msg.guildId, userId });
                                    if (currentRow[dbInListColumn]) continue;
                                    await Database.SetRowAttr("user", { "guildId": msg.guildId, userId }, {
                                        [dbInListColumn]: true
                                    });

                                    addedToList.push(Utils.FormatString(
                                        locale.common.userListEntry,
                                        user.displayName, user.id
                                    ));
                                }
                            }
                            
                            if (addedToList.length === 0) {
                                await msg.reply(
                                    _GetFormattedListLocale(locale, "addedUserListEmpty", guild)
                                );
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                _GetFormattedListLocale(locale, "addedUserList", guild),
                                ...addedToList
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
                        "execute": async (msg, guild, locale, [ usersToRemove ]) => {
                            /** @type {String[]} */
                            const removedFromList = [ ];
                            for (let i = 0; i < usersToRemove.length; i++) {
                                const userId = usersToRemove[i];

                                const currentRow = await Database.GetRow("user", { "guildId": msg.guildId, userId });
                                if (currentRow === undefined || !currentRow[dbInListColumn]) continue;
                                await Database.SetRowAttr("user", { "guildId": msg.guildId, userId }, {
                                    [dbInListColumn]: false
                                });
        
                                const user = msg.guild.members.resolve(userId);
                                removedFromList.push(Utils.FormatString(
                                    locale.common.userListEntry,
                                    user?.displayName ?? locale.common.unknownUser, userId
                                ));
                            }
                            
                            if (removedFromList.length === 0) {
                                await msg.reply(
                                    _GetFormattedListLocale(locale, "removedUserListEmpty", guild)
                                );
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                _GetFormattedListLocale(locale, "removedUserList", guild),
                                ...removedFromList
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
                        "name": "clear",
                        "shortcut": "c",
                        "execute": async (msg, guild, locale) => {
                            const rows = await Database.SetRowsAttr("role", {
                                [dbInListColumn]: true
                            }, {
                                [dbInListColumn]: false
                            });

                            await msg.reply(Utils.FormatString(
                                locale.command.clearedRoleList,
                                _GetListTypeLocale(locale, guild), rows.length
                            ));
                        }
                    },
                    {
                        "name": "list",
                        "shortcut": "l",
                        "execute": async (msg, guild, locale) => {
                            const rolesInList = await Database.GetRows("role", { "guildId": msg.guildId, [dbInListColumn]: true });

                            /** @type {String[]} */
                            const accessList = [ ];
                            for (let i = 0; i < rolesInList.length; i++) {
                                const roleId = rolesInList[i].roleId;
                                const role = msg.guild.roles.resolve(roleId);
                                accessList.push(Utils.FormatString(
                                    locale.common.roleListEntry,
                                    role?.name ?? locale.common.unknownRole, roleId
                                ));
                            }
                            
                            if (accessList.length === 0) {
                                await msg.reply(
                                    _GetFormattedListLocale(locale, "currentRoleListEmpty", guild)
                                );
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                _GetFormattedListLocale(locale, "currentRoleList", guild),
                                ...accessList
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
                        "execute": async (msg, guild, locale, [ rolesToAdd ]) => {
                            /** @type {String[]} */
                            const addedToList = [ ];
                            for (let i = 0; i < rolesToAdd.length; i++) {
                                const roleId = rolesToAdd[i];
                                const role = msg.guild.roles.resolve(roleId);
                                if (role !== null) {
                                    const currentRow = await Database.GetOrCreateRow("role", { "guildId": msg.guildId, roleId });
                                    if (currentRow[dbInListColumn]) continue;
                                    await Database.SetRowAttr("role", { "guildId": msg.guildId, roleId }, {
                                        [dbInListColumn]: true
                                    });

                                    addedToList.push(Utils.FormatString(
                                        locale.common.roleListEntry,
                                        role.name, role.id
                                    ));
                                }
                            }
                            
                            if (addedToList.length === 0) {
                                await msg.reply(
                                    _GetFormattedListLocale(locale, "addedRoleListEmpty", guild)
                                );
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                _GetFormattedListLocale(locale, "addedRoleList", guild),
                                ...addedToList
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
                        "execute": async (msg, guild, locale, [ rolesToRemove ]) => {
                            /** @type {String[]} */
                            const removedFromList = [ ];
                            for (let i = 0; i < rolesToRemove.length; i++) {
                                const roleId = rolesToRemove[i];

                                const currentRow = await Database.GetRow("role", { "guildId": msg.guildId, roleId });
                                if (currentRow === undefined || !currentRow[dbInListColumn]) continue;
                                await Database.SetRowAttr("role", { "guildId": msg.guildId, roleId }, {
                                    [dbInListColumn]: false
                                });
        
                                const role = msg.guild.roles.resolve(roleId);
                                removedFromList.push(Utils.FormatString(
                                    locale.common.roleListEntry,
                                    role.name ?? locale.common.roleListEntry, roleId
                                ));
                            }
                            
                            if (removedFromList.length === 0) {
                                await msg.reply(
                                    _GetFormattedListLocale(locale, "removedRoleListEmpty", guild)
                                );
                                return;
                            }
                            
                            await msg.reply(Utils.JoinArray([
                                _GetFormattedListLocale(locale, "removedRoleList", guild),
                                ...removedFromList
                            ], "\n"));
                        }
                    }
                ]
            }
        ]
    });
};

module.exports = CreateCommand({
    "name": "access-list",
    "shortcut": "al",
    "permissions": Permissions.FLAGS.MANAGE_ROLES,
    "subcommands": [
        _CreateBlacklistCommand("sound", "s", "inSoundAccessList", "isSoundAccessBlacklist")
    ]
});

module.exports.IsBlacklisted = IsBlacklisted;
