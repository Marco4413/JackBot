const Discord = require("discord.js");
const Database = require("./Database.js");
const DatabaseDefinitions = require("./DatabaseDefinitions.js");
const Localization = require("./Localization.js");
const Logger = require("./Logger.js");
const Utils = require("./Utils.js");

// #region typedefs

/** @typedef {"string"|"number"|"boolean"|"date"|"channel"|"user"|"role"|"discord-id"|"text"} CommandArgumentType */

/**
 * @typedef {Object} CommandArgument A Command's Argument Definition
 * @property {String} name The name to be used for pretty errors
 * @property {CommandArgumentType[]} types The Types the Argument can be
 * @property {Boolean} [isVariadic] Whether or not the Argument is variadic
 * @property {Any} [default] The default value for the Argument ( Doesn't do anything for variadic, if not specified the Argument is required )
 */

/**
 * @typedef {String|String[]} ParsedCommandArgument
 * @typedef {(msg: Discord.Message, guild: DatabaseDefinitions.GuildRow, locale: Localization.Locale, args: ParsedCommandArgument[]) => Promise<Void>} CommandExecute The callback of a Command
 * @typedef {(msg: Discord.Message, guild: DatabaseDefinitions.GuildRow, locale: Localization.Locale) => Promise<Boolean>} CommandCanExecute
 */

/**
 * @typedef {Object} Command A Command's Definition
 * @property {String} name The name of the Command
 * @property {String} [shortcut] The shortcut for the Command
 * @property {CommandCanExecute} [canExecute] The function called to check whether or not the Command can be executed
 * @property {Command[]} [subcommands] A List of Subcommands
 * @property {Boolean} [channelPermissions] Whether or not the specified permissions are for the channel
 * @property {Discord.PermissionResolvable} [permissions] The permissions required to run the Command
 * @property {CommandArgument[]} [arguments] The Arguments of the Command ( If not specified all arguments are given as Strings )
 * @property {CommandExecute} execute The function called to Execute the Command
 */

/** @private @typedef {"none"|"invalid_type"|"not_provided"} _ArgumentParseError */

/**
 * @private
 * @typedef {Object} _ArgumentParseResult
 * @property {_ArgumentParseError} error
 * @property {CommandArgument} errorArgDef
 * @property {Any} argument
 */

/**
 * @private
 * @typedef {Object} _ArgumentsParseResult
 * @property {_ArgumentParseError} error
 * @property {Number} errorArgIndex
 * @property {CommandArgument} errorArgDef
 * @property {ParsedCommandArgument[]} arguments
 */

// #endregion

// #region Private Functions

/**
 * @param {Discord.Message} msg
 * @param {String} [arg]
 * @param {Number} argIndex
 * @param {CommandArgument} argDef
 * @param {Boolean} [isRequired]
 * @returns {_ArgumentParseResult}
 */
const _ParseArgument = (arg, argDef, isRequired = true) => {
    if (argDef.types.length === 0) return { "error": "invalid_type", "errorArgDef": argDef, "argument": undefined };

    if (arg == null || arg.length === 0) {
        return {
            "error": argDef.default === undefined && isRequired ? "not_provided" : "none",
            "errorArgDef": argDef,
            "argument": argDef.default
        };
    }

    let parsedArg = undefined;
    for (let i = 0; i < argDef.types.length; i++) {
        const argType = argDef.types[i];
        switch (argType) {
        case "string":
            parsedArg = arg;
            break;
        case "number": {
            const asNumber = Number.parseFloat(arg);
            if (!Number.isNaN(asNumber)) parsedArg = asNumber;
            break;
        }
        case "boolean": {
            const lowerArg = arg.toLowerCase();
            const isTrue  = lowerArg === "true"  || lowerArg === "1";
            const isFalse = lowerArg === "false" || lowerArg === "0";
            if (isTrue || isFalse) parsedArg = isTrue;
            break;
        }
        case "date": {
            const date = Utils.ParseDate(arg);
            if (date != null) parsedArg = date;
            break;
        }
        case "channel": {
            const channelIdMatcher = /^<#([0-9]+)>$|^([0-9]+)$/g;
            const channelId = channelIdMatcher.exec(arg);
            if (channelId != null) parsedArg = channelId[1] ?? channelId[2];
            break;
        }
        case "user": {
            const userIdMatcher = /^<@!?([0-9]+)>$|^([0-9]+)$/g;
            const userId = userIdMatcher.exec(arg);
            if (userId != null) parsedArg = userId[1] ?? userId[2];
            break;
        }
        case "role": {
            const roleIdMatcher = /^<@&([0-9]+)>$|^([0-9]+)$/g;
            const roleId = roleIdMatcher.exec(arg);
            if (roleId != null) parsedArg = roleId[1] ?? roleId[2];
            break;
        }
        case "discord-id": {
            const discordIdMatcher = /^([0-9]+)$/g;
            const discordId = discordIdMatcher.exec(arg);
            if (discordId != null) parsedArg = discordId[1];
            break;
        }
        default:
            throw new Error(`Invalid Argument Type: ${argType}`);
        }

        if (parsedArg !== undefined) break;
    }

    return {
        "error": parsedArg === undefined ? "invalid_type" : "none",
        "errorArgDef": argDef,
        "argument": parsedArg
    };
};

const _WHITESPACE_MATCHER = /\s+/g;

/**
 * @param {String} rawContent 
 * @returns {[ String, String, String ]}
 */
const _NextArgument = rawContent => {
    const content = rawContent.trim();
    const argIndex = content.search(_WHITESPACE_MATCHER);
    if (argIndex < 0) return content.length > 0 ? [ content, "", content ] : [ "", "", content ];
    return [ content.substring(0, argIndex), content.substring(argIndex).trimStart(), content ];
}; 

/**
 * @param {Discord.Message} msg
 * @param {String} rawArgs
 * @param {CommandArgument[]} [argDefs]
 * @returns {_ArgumentsParseResult}
 */
const _ParseArguments = (rawArgs, argDefs) => {
    if (argDefs === undefined) return { "error": "none", "errorArgIndex": -1, "arguments": [ rawArgs ] };
    if (argDefs.length === 0) return { "error": "none", "errorArgIndex": -1, "arguments": [ ] };

    let currentArg = _NextArgument(rawArgs);
    let argIndex = 0;

    const parsedArgs = [ ];
    for (let i = 0; i < argDefs.length; i++) {
        const argDef = argDefs[i];

        if (argDef.types.includes("text")) {
            parsedArgs.push(currentArg[2]);
            break;
        } else if (argDef.isVariadic) {
            const variadic = [ ];
            
            while (currentArg[0].length > 0) {
                const { argument } = _ParseArgument(currentArg[0], argDef, false);
                if (argument === undefined) break;
                currentArg = _NextArgument(currentArg[1]);
                argIndex++;
                variadic.push(argument);
            }
            
            parsedArgs.push(variadic);
        } else {
            const { argument, error, errorArgDef } = _ParseArgument(currentArg[0], argDef);
            if (argument === undefined)
                return { error, "errorArgIndex": argIndex, errorArgDef };
            currentArg = _NextArgument(currentArg[1]);
            argIndex++;
            parsedArgs.push(argument);
        }
    }

    return { "error": "none", "errorArgIndex": -1, "arguments": parsedArgs };
};

/**
 * @param {Discord.Permissions} memberPerms
 * @param {Discord.PermissionResolvable} requiredPermsResolvable
 * @param {Localization.Locale} locale
 * @returns {String}
 */
const _ListMissingPerms = (memberPerms, requiredPermsResolvable, locale) => {
    const adminKey = "ADMINISTRATOR";
    const requiredPerms = Discord.Permissions.resolve(requiredPermsResolvable);
    const missingPerms =
        requiredPerms === Discord.Permissions.FLAGS.ADMINISTRATOR ?
            [ adminKey ] : memberPerms.missing(requiredPerms);

    const permsLocale = locale.GetSubLocale("common.permissions", false);
    return Utils.JoinArray(
        missingPerms,
        locale.GetCommon("listSeparator"),
        el => permsLocale?.Get(el, false) ?? el
    );
};

/**
 * @param {CommandArgument} argDef
 * @param {Localization.Locale} locale
 * @returns {String}
 */
const _ListPossibleTypes = (argDef, locale) => {
    const typesLocale = locale.GetSubLocale("common.argumentTypes", false);
    return Utils.JoinArray(
        argDef.types,
        locale.GetCommon("listSeparator"),
        el => typesLocale?.Get(el, false) ?? el
    );
};

// #endregion

// #region Public Functions

/**
 * Checks if the specified Command is valid
 * @param {Command} command The Command to check
 * @returns {Boolean} Whether or not the specified Command is valid
 */
const IsValidCommand = (command) => {
    // This basically makes sure that all fields are present and have their possible value types
    let isValid = (
        typeof command === "object" &&
        typeof command.name === "string" &&
        ( command.canExecute === undefined || typeof command.canExecute === "function" ) &&
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
                if (!(
                    typeof arg.name === "string" &&
                    Array.isArray(arg.types) &&
                    ( arg.isVariadic === undefined || typeof arg.isVariadic === "boolean" )
                )) return false;
                for (const argType of arg.types) {
                    if (typeof argType !== "string")
                        return false;
                }
            }
        }
    }

    return isValid;
};

/**
 * Tests if the author of the specified Message has the specified Permissions
 * in the guild or the specified Channel and replies to the Message whether or
 * not the author has the Permissions with the specified CommandLocale
 * @param {Discord.Message} msg The Message to use
 * @param {Localization.Locale} locale The Locale to use
 * @param {Discord.PermissionResolvable} requiredPerms The Permissions Required
 * @param {Discord.GuildChannel?} [channel] The Channel to test the Permissions on ( null for Guild )
 * @returns {Promise<Boolean>} Whether or not the Message's author has the specified Permissions
 */
const IsMissingPermissions = async (msg, locale, requiredPerms, channel = null) => {
    if (channel == null) {
        if (!msg.member.permissions.has(requiredPerms)) {
            await msg.reply(locale.GetCommonFormatted(
                "noGuildPerms", {
                    "permissions": _ListMissingPerms(msg.member.permissions, requiredPerms, locale)
                }
            ));
            return true;
        }
    } else {
        const channelPerms = msg.member.permissionsIn(channel);
        if (!channelPerms.has(requiredPerms)) {
            await msg.reply(locale.GetCommonFormatted(
                "noChannelPerms",{
                    "permissions": _ListMissingPerms(channelPerms, requiredPerms, locale),
                    "channel-name": channel.name
                }
            ));
            return true;
        }
    }
    return false;
};

/**
 * Executes the Commands from the specified commandList and splittedMessage ( Obtained with {@link SplitCommand} )
 * @param {Discord.Message} msg The message to be given to Commands when executing and to reply with error feedback
 * @param {DatabaseDefinitions.GuildRow} guildRow The Guild Row from the Database
 * @param {Localization.Locale} locale The locale to use for messages
 * @param {String} msgContent The message's content
 * @param {Command[]} commandList The list of Commands to check for
 * @returns {Promise<Boolean>} Whether or not a candidate Command was Found ( It may have failed Execution )
 */
const ExecuteCommand = async (msg, guildRow, locale, msgContent, commandList) => {
    const [ commandName, commandArguments ] = _NextArgument(msgContent);
    if (commandName.length === 0) return false;

    for (let i = 0; i < commandList.length; i++) {
        const command = commandList[i];

        // If the command name doesn't match go to the next command
        if (!( guildRow.shortcuts && command.shortcut === commandName ) &&
            command.name !== commandName
        ) continue;

        // If the command needs a specific permission from the user check for thems
        if (command.permissions != null) {
            if (await IsMissingPermissions(msg, locale, command.permissions, command.channelPermissions ? msg.channel : null))
                return true;
        }

        /** @type {Localization.Locale} */
        const commandLocale = locale.GetCommandLocale(command.name, true) ?? locale;

        if (command.canExecute != null &&
            !await command.canExecute(msg, guildRow, commandLocale)
        ) return true;

        // If this command has subcommands then try to execute those
        if (command.subcommands != null) {
            if (await ExecuteCommand(msg, guildRow, commandLocale, commandArguments, command.subcommands))
                return true;
        }

        // If this command can't be executed then it must have subcommands
        if (command.execute === undefined) {
            await msg.reply(locale.GetCommonFormatted(
                "noSubcommand", {
                    "subcommands": locale.GetFormattedInlineList(
                        command.subcommands ?? [ ], null,
                        c => ({ "value": c.name }), null
                    )
                }
            ));
            return true;
        }

        // Parsing command arguments
        const { arguments: parsedArgs, error, errorArgIndex, errorArgDef } = _ParseArguments(commandArguments, command.arguments);
        Logger.Debug(parsedArgs);

        // Check error given by the Argument Parsing
        switch (error) {
        case "none":
            break;
        case "not_provided":
            await msg.reply(locale.GetCommonFormatted(
                "missingArg", {
                    "name": errorArgDef.name,
                    "position": errorArgIndex + 1
                }
            ));
            return true;
        case "invalid_type":
            await msg.reply(locale.GetCommonFormatted(
                "wrongArgType", {
                    "name": errorArgDef.name,
                    "position": errorArgIndex + 1,
                    "types": _ListPossibleTypes(errorArgDef, locale)
                }
            ));
            return true;
        default:
            throw new Error(`Not handled error type of Argument: ${error}`);
        }

        // Execute command with parsedArgs
        await command.execute(msg, guildRow, commandLocale, parsedArgs);
        return true;
    }

    // Return false: No Command Found
    return false;
};

/**
 * Helper function to give better autocompletion when creating Commands ( Doesn't check for validity ).
 * Returns the same value that's given
 * @param {Command} cmd
 * @returns {Command}
 */
const CreateCommand = cmd => cmd;

// #endregion

module.exports = {
    IsValidCommand, ExecuteCommand, CreateCommand, IsMissingPermissions,
    Utils, Database, DatabaseDefinitions, Permissions: Discord.Permissions
};
