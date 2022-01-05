const fs = require("fs");
const { MAX_LOCALE_NAME_LENGTH, GuildModel } = require("./DatabaseDefinitions.js");
const Logger = require("./Logger.js");

/** The Default Locale that should always be present */
const DEFAULT_LOCALE = GuildModel.locale.defaultValue;
const _Locales = { };

/**
 * Registers all Locales found in the localization folder
 */
const RegisterLocales = () => {
    const localesFolder = "./localization";
    fs.readdirSync(localesFolder).forEach(file => {
        if (file.endsWith(".json")) {
            const localeName = file.substring(0, file.length - ".json".length);
            if (localeName.length <= MAX_LOCALE_NAME_LENGTH) {
                _Locales[localeName] = require(`${localesFolder}/${file}`);
                Logger.Info(`Locale "${localeName}" registered!`);
            } else {
                Logger.Warn(`Locale "${localeName}" couldn't be loaded because its name exceeds the max locale name length of ${MAX_LOCALE_NAME_LENGTH}.`);
            }
        }
    });

    if (_Locales[DEFAULT_LOCALE] === undefined)
        throw new Error(`Default Locale "${DEFAULT_LOCALE}" couldn't be loaded.`);
};

/**
 * @typedef {Object} CommandLocaleRoot The Root for a Command's Locale
 * @property {Object} [subcommands] Localization for this Command's Subcommands
 */

/**
 * @typedef {Object} CommandLocale The Locale given to Commands when Executed
 * @property {Object} common Common localization
 * @property {CommandLocaleRoot} command This Command's localization
 */

/**
 * @typedef {Object} LocaleRoot The Root of a Locale File
 * @property {Object} common Common localization
 * @property {Object<String, CommandLocaleRoot>} commands Command-specific localization
 */

/**
 * Returns the specified locale or the default one if not present
 * @param {String} localeName The locale to load
 * @returns {LocaleRoot} The specified Locale
 */
const GetLocale = (localeName) => {
    return _Locales[localeName] === undefined ? _Locales[DEFAULT_LOCALE] : _Locales[localeName];
};

/**
 * Checks if the specified locale exists
 * @param {String} localeName The locale to check for
 * @returns {Boolean} Whether or not the specified locale exists
 */
const HasLocale = (localeName) => {
    return _Locales[localeName] !== undefined;
};

/**
 * Returns all Available Locales' Name
 * @returns {String[]}
 */
const GetAvailableLocales = () => {
    return Object.keys(_Locales);
};

/**
 * Gets the Locale for the specified Command
 * @param {String} localeName The name of the Locale to get the {@link CommandLocale} from
 * @param {String[]} commandPath The path to the Command
 * @returns {CommandLocale} The Locale for the Command
 */
const GetCommandLocale = (localeName, commandPath) => {
    const locale = GetLocale(localeName);
    if (commandPath.length === 0) return { "common": locale.common, "command": { } };

    /** @type {CommandLocale} */
    let commandLocale = { "common": locale.common, "command": locale.commands[commandPath[0]] };
    for (let i = 1; i < commandPath.length; i++) {
        commandLocale.command =
            commandLocale.command.subcommands === undefined ?
                undefined : commandLocale.command.subcommands[commandPath[i]];
        if (commandLocale.command === undefined) break;
    }

    if (commandLocale.command === undefined)
        commandLocale.command = { };
    
    return commandLocale;
};

module.exports = { DEFAULT_LOCALE, RegisterLocales, GetLocale, GetCommandLocale, HasLocale, GetAvailableLocales };
