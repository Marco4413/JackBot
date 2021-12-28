const fs = require("fs");
const command = require("./Command.js");
const Logger = require("./Logger.js");

/** @type {command.Command[]} */
const _Commands = [ ];

/**
 * Registers all Commands found in the Commands folder
 */
const RegisterCommands = () => {
    const commandsFolder = "./commands";
    fs.readdirSync(commandsFolder).forEach(file => {
        if (file.endsWith(".js")) {
            const script = require(`${commandsFolder}/${file}`);
            if (command.IsValidCommand(script)) {
                _Commands.push(script);
                Logger.Info(`Command "${script.name}" registered!`);
            } else {
                Logger.Warn(`Command "${file}" couldn't be loaded because it returned an invalid Command.`);
            }
        }
    });
};

/**
 * Returns all Registered Commands
 * @returns {command.Command[]} All Registered Commands
 */
const GetCommands = () => {
    return _Commands;
};

module.exports = {
    RegisterCommands, GetCommands
};
