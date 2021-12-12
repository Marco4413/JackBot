const discord = require("discord.js");
const Database = require("./Database.js");
const DatabaseDefinitions = require("./DatabaseDefinitions.js");

/** @typedef {"string"|"number"|"boolean"} CommandArgumentType */

/**
 * @typedef {Object} CommandArgument
 * @property {CommandArgumentType[]} types
 * @property {Any} [default]
 */

/**
 * @typedef {Object} Command
 * @property {String} name
 * @property {(msg: discord.Message, guild: DatabaseDefinitions.GuildRow, args: Any[]) => void} execute
 * @property {Boolean} [channelPermissions]
 * @property {discord.PermissionResolvable} [permissions]
 * @property {String} [shortcut]
 * @property {Command[]} [subcommands]
 * @property {CommandArgument[]} [arguments]
 */

/**
 * @param {String} arg
 * @param {CommandArgumentType[]} argTypes
 * @returns {Any}
 */
const _ConvertArgument = (arg, argTypes) => {
    if (argTypes === 0) return undefined;

    for (let i = 0; i < argTypes.length; i++) {
        const type = argTypes[i];
        switch (type) {
        case "string":
            return arg;
        case "number": {
            const asNumber = Number.parseFloat(arg);
            if (!Number.isNaN(asNumber)) return asNumber;
            break;
        }
        case "boolean": {
            const isTrue  = arg === "true"  || arg === "1";
            const isFalse = arg === "false" || arg === "0";
            if (isTrue || isFalse) return isTrue;
            break;
        }
        }
    }

    return undefined;
};

/**
 * @param {Command} command
 * @returns {Boolean}
 */
const IsValidCommand = (command) => {
    let isValid = (
        typeof command === "object" &&
        typeof command.name === "string" &&
        ( command.execute === undefined || typeof command.execute === "function" ) &&
        ( command.channelPermissions === undefined || typeof command.channelPermissions === "boolean" ) &&
        ( command.permissions === undefined || typeof command.permissions === "number" || typeof command.permissions === "bigint" ) &&
        ( command.shortcut === undefined || typeof command.shortcut === "string" ) &&
        ( command.subcommands === undefined || Array.isArray(command.subcommands) ) &&
        ( command.arguments === undefined || Array.isArray(command.arguments) )
    );

    if (isValid) {
        if (Array.isArray(command.subcommands)) {
            for (const cmd of command.subcommands) {
                if (!IsValidCommand(cmd))
                    return false;
            }
        }

        if (Array.isArray(command.arguments)) {
            for (const arg of command.arguments) {
                if (!Array.isArray(arg.types)) return false;
                for (const argType of arg.types) {
                    if (!(argType === "string" || argType === "number" || argType === "boolean"))
                        return false;
                }
            }
        }
    }

    return isValid;
};

/**
 * @param {String} command
 * @returns {String[]}
 */
const SplitCommand = (command) => {
    if (command.length === 0) return [ ];
    return command.split(/ /g);
};

/**
 * @param {discord.Message} msg
 * @param {DatabaseDefinitions.GuildRow} guildRow
 * @param {String[]} splittedMessage
 * @param {Command[]} commandList
 * @param {Boolean} useShortcuts
 * @returns {Boolean}
 */
const ExecuteCommand = (msg, guildRow, splittedMessage, commandList) => {
    const [ commandName, ...commandArgs ] = splittedMessage;

    for (let i = 0; i < commandList.length; i++) {
        const command = commandList[i];

        // If the command name doesn't match go to the next command
        if (
            !( guildRow.shortcuts && command.shortcut === commandName ) &&
            command.name !== commandName
        ) continue;

        // If the command needs a specific permission from the user
        if (command.permissions !== undefined) {
            // If it's a permission needed in the current channel
            if (command.channelPermissions === true) {
                // Check permissions of the user in the message's channel
                if (!msg.member.permissionsIn(msg.channel.id).has(command.permissions)) {
                    msg.reply(`Not enough permissions in channel ${msg.channel.name} to run this command.`);
                    return true;
                }
            } else {
                // Else check global permissions
                if (!msg.member.permissions.has(command.permissions)) {
                    msg.reply("Not enough permissions to run this command.");
                    return true;
                }
            }
        }

        // If this command has subcommands then try to execute those
        if (command.subcommands !== undefined) {
            if (ExecuteCommand(msg, guildRow, commandArgs, command.subcommands))
                return true;
        }

        // If this command can't be executed then it must have subcommands
        if (command.execute === undefined) {
            msg.reply("A valid subcommand must be provided.");
            return true;
        }

        // Parsing command arguments
        const parsedCommandArgs = [ ];
        // If arguments are defined
        if (command.arguments !== undefined) {
            // For each argument definition
            for (let j = 0; j < command.arguments.length; j++) {
                const argDef = command.arguments[j];
                const arg = commandArgs[j];
    
                // If the current argument is undefined then use the default
                //  value if there is one else return
                if (arg === undefined) {
                    if (argDef.default === undefined) {
                        msg.reply(`Argument \\#${j} must be provided.`);
                        return true;
                    }

                    parsedCommandArgs.push(argDef.default);
                } else {
                    // Try converting the current argument to the type specified by the definition
                    const convertedArg = _ConvertArgument(arg, argDef.types);
                    // If undefined is returned then it couldn't be converted
                    if (convertedArg === undefined) {
                        msg.reply(`Argument \\#${j} is of wrong type.`);
                        return true;
                    }

                    parsedCommandArgs.push(convertedArg);
                }
            }
        }

        // Execute command with parsedCommands if arguments are defined else with the raw arguments
        command.execute(msg, guildRow, parsedCommandArgs.length === 0 ? commandArgs : parsedCommandArgs);
        return true;
    }

    // Return false: No Command Found
    return false;
};

/**
 * @param {Command} cmd
 * @returns {Command}
 */
const CreateCommand = cmd => cmd;

module.exports = {
    IsValidCommand, SplitCommand, ExecuteCommand, CreateCommand,
    Database, DatabaseDefinitions, Permissions: discord.Permissions
};
