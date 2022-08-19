const { ExecuteCommand } = require("../../Command.js");
const { GetCommands } = require("../../Commands.js");
const { GetLocale } = require("../../Localization.js");
const { Client } = require("../../Client.js");
const DatabaseDefinitions = require("../../DatabaseDefinitions.js");

/**
 * @param {String} str
 * @returns {Number}
 */
const _StartsWithBotMention = (str) => {
    const botMentionMatcher = new RegExp(`^<@!?${Client.user.id}>`, "g");
    const noMentionStr = str.replace(botMentionMatcher, "");
    return str.length - noMentionStr.length;
};

/**
 * This module Manages Commands
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @returns {Promise<Boolean>}
 */
module.exports = async (msg, guild) => {
    const botMentionEnd = _StartsWithBotMention(msg.content);
    const executeCommand = botMentionEnd > 0 || msg.content.startsWith(guild.prefix);

    if (executeCommand) {
        const noPrefixContent = msg.content.substring(
            botMentionEnd > 0 ? botMentionEnd : guild.prefix.length
        ).trim();

        if (noPrefixContent.length === 0) return true;

        const guildLocale = GetLocale(guild.locale);
        if (!await ExecuteCommand(msg, guild, guildLocale, noPrefixContent, GetCommands())) {
            await msg.reply(guildLocale.GetCommon("invalidCommand"));
        }

        return true;
    }

    return false;
};
