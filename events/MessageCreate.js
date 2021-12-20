const { CreateEventListener } = require("../EventListener.js");
const { SplitCommand, ExecuteCommand } = require("../Command.js");
const { GetCommands } = require("../Commands.js");
const { GetLocale } = require("../Localization.js");
const db = require("../Database.js");

const { Client } = require("../Client.js");

/**
 * @param {String} str
 * @returns {Number}
 */
const _StartsWithBotMention = (str) => {
    const botMentionMatcher = new RegExp(`^<@!?${Client.user.id}>`, "g");
    const noMentionStr = str.replace(botMentionMatcher, "");
    return str.length - noMentionStr.length;
};

module.exports = CreateEventListener(
    "messageCreate", async msg => {
        if (msg.author.bot || msg.channel.type !== "GUILD_TEXT" || msg.deleted) return;
        
        const guild = await db.GetGuild(msg.guild.id);

        const botMentionEnd = _StartsWithBotMention(msg.content);
        const executeCommand = botMentionEnd > 0 || msg.content.startsWith(guild.prefix);

        if (executeCommand) {
            const splittedCommand = SplitCommand(
                msg.content.substring(
                    botMentionEnd > 0 ? botMentionEnd : guild.prefix.length
                ).trim()
            );

            if (splittedCommand.length === 0) return;

            const guildLocale = GetLocale(guild.locale);
            const commandLocale = { "common": guildLocale.common, "command": { "subcommands": guildLocale.commands } };
            if (!ExecuteCommand(msg, guild, commandLocale, splittedCommand, GetCommands())) {
                msg.reply(guildLocale.common.invalidCommand);
            }
        }
    }
);
