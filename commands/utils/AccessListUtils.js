const { GuildMember, Message } = require("discord.js");
const Database = require("../../Database.js");
const DatabaseDefinitions = require("../../DatabaseDefinitions.js");
const { Locale } = require("../../Localization.js");

/** @typedef {DatabaseDefinitions.UserRow & DatabaseDefinitions.RoleRow} UserRoleRows */

/**
 * Checks if the specified member is blacklisted based on the value at the key dbColumn
 * on both user and role Database Rows
 * @template {keyof UserRoleRows} T
 * @param {GuildMember} member The Member to check
 * @param {T} dbInListColumn The column that specifies if the Member is in the Access List
 * @param {keyof DatabaseDefinitions.GuildRow} dbIsBlacklistColumn The column that specifies if the Access List is a Blacklist
 * @returns {Promise<Boolean>} Whether or not the specified member is blacklisted
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
 * Checks if the specified member is blacklisted based on the value at the key dbColumn
 * on both user and role Database Rows and replies with the blacklisted message if necessary
 * @template {keyof UserRoleRows} T
 * @param {Locale} locale The Locale to reply to the member with
 * @param {String} commandName The name of the Command for pretty replies
 * @param {Message} msg The message of the user to check and to reply to
 * @param {T} dbInListColumn The column that specifies if the Member is in the Access List
 * @param {keyof DatabaseDefinitions.GuildRow} dbIsBlacklistColumn The column that specifies if the Access List is a Blacklist
 * @returns {Promise<Boolean>} Whether or not the specified member is blacklisted
 */
const ReplyIfBlacklisted = async (locale, commandName, msg, dbInListColumn, dbIsBlacklistColumn) => {
    if (await IsBlacklisted(msg.member, dbInListColumn, dbIsBlacklistColumn)) {
        await msg.reply(locale.GetCommonFormatted(
            "blacklistedCommand", commandName
        ));
        return true;
    }
    return false;
};

module.exports = { IsBlacklisted, ReplyIfBlacklisted };
