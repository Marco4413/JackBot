const { CreateEventListener } = require("../EventListener.js");
const { SplitCommand, ExecuteCommand } = require("../Command.js");
const { GetCommands } = require("../Commands.js");
const db = require("../Database.js");

module.exports = CreateEventListener(
    "messageCreate", msg => {
        if (msg.author.bot) return;
        
        const guild = db.AddGuildByID(msg.guild.id);
        if (msg.content.startsWith(guild.prefix)) {
            const splittedCommand = SplitCommand(
                msg.content.substring(guild.prefix.length).trim()
            );

            if (splittedCommand.length === 0) return;

            if (!ExecuteCommand(msg, splittedCommand, GetCommands(), guild.shortcuts, msg, guild)) {
                msg.reply(`The specified command is not valid.`);
            }
        }
    }
);
