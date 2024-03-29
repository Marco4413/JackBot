const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

// Don't know why but if I import DatabaseDefinitions from Command.js auto-completion doesn't work
/** @typedef {import("../DatabaseDefinitions.js").UserRow & import("../DatabaseDefinitions.js").RoleRow} UserRoleRows */
/** @typedef {import("../DatabaseDefinitions.js").GuildRow} GuildRow */

/**
 * @param {String} name
 * @param {String} shortcut
 * @param {keyof UserRoleRows} dbInListColumn
 * @param {keyof GuildRow} dbIsBlacklistColumn
 * @returns {import("../Command.js").Command}
 */
const _CreateAccesslistCommand = (name, shortcut, dbInListColumn, dbIsBlacklistColumn) => {
    const _GetListTypeLocale = (locale, guild) =>
        guild[dbIsBlacklistColumn] ? locale.Get("blacklist") : locale.Get("whitelist");

    const _GetFormattedListLocale = (locale, commandLocaleKey, guild) => {
        return locale.GetFormatted(
            commandLocaleKey,
            { "list-type": _GetListTypeLocale(locale, guild) }
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
                                await msg.reply(locale.Get("invalidListType"));
                                return;
                            }

                            const newGuild = await Database.SetRowAttr("guild", { "id": msg.guildId }, {
                                [dbIsBlacklistColumn]: isBlacklist
                            });

                            await msg.reply(_GetFormattedListLocale(locale, "setListType", newGuild));
                        }
                    }
                ],
                "execute": async (msg, guild, locale) => {
                    await msg.reply(_GetFormattedListLocale(locale, "currentListType", guild));
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

                            await msg.reply(locale.GetFormatted(
                                "clearedUserList", {
                                    "list-type": _GetListTypeLocale(locale, guild),
                                    "removed-count": rows.length
                                }
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
                                const user = await Utils.SafeFetch(msg.guild.members, userId);
                                accessList.push(locale.GetSoftMention(
                                    "User", user?.displayName, userId, true
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
                                const user = await Utils.SafeFetch(msg.guild.members, userId);
                                if (user != null) {
                                    const currentRow = await Database.GetOrCreateRow("user", { "guildId": msg.guildId, userId });
                                    if (currentRow[dbInListColumn]) continue;
                                    await Database.SetRowAttr("user", { "guildId": msg.guildId, userId }, {
                                        [dbInListColumn]: true
                                    });

                                    addedToList.push(locale.GetSoftMention(
                                        "User", user.displayName, user.id, true
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
                                if (currentRow == null || !currentRow[dbInListColumn]) continue;
                                await Database.SetRowAttr("user", { "guildId": msg.guildId, userId }, {
                                    [dbInListColumn]: false
                                });
        
                                const user = await Utils.SafeFetch(msg.guild.members, userId);
                                removedFromList.push(locale.GetSoftMention(
                                    "User", user?.displayName, userId, true
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


                            await msg.reply(locale.GetFormatted(
                                "clearedRoleList", {
                                    "list-type": _GetListTypeLocale(locale, guild),
                                    "removed-count": rows.length
                                }
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
                                const role = await Utils.SafeFetch(msg.guild.roles, roleId);
                                accessList.push(locale.GetSoftMention(
                                    "Role", role?.name, roleId, true
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
                                const role = await Utils.SafeFetch(msg.guild.roles, roleId);
                                if (role != null) {
                                    const currentRow = await Database.GetOrCreateRow("role", { "guildId": msg.guildId, roleId });
                                    if (currentRow[dbInListColumn]) continue;
                                    await Database.SetRowAttr("role", { "guildId": msg.guildId, roleId }, {
                                        [dbInListColumn]: true
                                    });

                                    addedToList.push(locale.GetSoftMention(
                                        "Role", role.name, role.id, true
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
                                if (currentRow == null || !currentRow[dbInListColumn]) continue;
                                await Database.SetRowAttr("role", { "guildId": msg.guildId, roleId }, {
                                    [dbInListColumn]: false
                                });
        
                                const role = await Utils.SafeFetch(msg.guild.roles, roleId);
                                removedFromList.push(locale.GetSoftMention(
                                    "Role", role?.name, roleId, true
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
    "permissions": Permissions.Flags.ManageRoles | Permissions.Flags.ManageGuild,
    "subcommands": [
        _CreateAccesslistCommand("sound", "s", "inSoundAccessList", "isSoundAccessBlacklist"),
        _CreateAccesslistCommand("channel", "ch", "inChannelAccessList", "isChannelAccessBlacklist"),
        _CreateAccesslistCommand("role", "r", "inRoleAccessList", "isRoleAccessBlacklist"),
        _CreateAccesslistCommand("suggestion", "suggest", "inSuggestionAccessList", "isSuggestionAccessBlacklist"),
        _CreateAccesslistCommand("suggestion-manager", "suggest-manager", "inSuggestionManagerAccessList", "isSuggestionManagerAccessBlacklist"),
        _CreateAccesslistCommand("credits", "cr", "inCreditsAccessList", "isCreditsAccessBlacklist"),
        _CreateAccesslistCommand("credits-manager", "cr-manager", "inCreditsManagerAccessList", "isCreditsManagerAccessBlacklist"),
        _CreateAccesslistCommand("social-manager", undefined, "inSocialManagerAccessList", "isSocialManagerAccessBlacklist")
    ]
});
