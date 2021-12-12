const { CreateEventListener } = require("../EventListener.js");
const { SplitCommand, ExecuteCommand } = require("../Command.js");
const { GetCommands } = require("../Commands.js");
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
        if (msg.author.bot) return;
        
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

            if (!ExecuteCommand(msg, guild, splittedCommand, GetCommands())) {
                msg.reply("The specified command is not valid.");
            }
        }
    }
);
