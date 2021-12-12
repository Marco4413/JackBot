const fs = require("fs");
const command = require("./Command.js");

/** @type {command.Command[]} */
const _Commands = [ ];

const RegisterCommands = () => {
    const commandsFolder = "./commands";
    fs.readdirSync(commandsFolder).forEach(file => {
        if (file.endsWith(".js")) {
            const script = require(`${commandsFolder}/${file}`);
            if (command.IsValidCommand(script)) {
                _Commands.push(script);
            } else {
                console.warn(`Command "${file}" couldn't be loaded because it returned an invalid Command.`);
            }
        }
    });
};

/**
 * @returns {command.Command[]}
 */
const GetCommands = () => {
    return _Commands;
};

module.exports = {
    RegisterCommands, GetCommands
};
