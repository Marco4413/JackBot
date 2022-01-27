const fs = require("fs");
const { Utils } = require("./Command.js");
const { MAX_LOCALE_NAME_LENGTH, GuildModel } = require("./DatabaseDefinitions.js");
const Logger = require("./Logger.js");

/** The Default Locale that should always be present */
const DEFAULT_LOCALE = GuildModel.locale.defaultValue;
/** @type {Object<String, Locale>} */
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
                const jsonLocale = require(`${localesFolder}/${file}`);
                _Locales[localeName] = new Locale(
                    jsonLocale, localeName, "", jsonLocale
                );

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
 * @private
 * @typedef {Object} _CommandLocaleRoot The Root for a Command's Locale
 * @property {Object} [subcommands] Localization for this Command's Subcommands
 */

/**
 * @private
 * @typedef {Object} _LocaleRoot The Root of a Locale File
 * @property {Object} common Common localization
 * @property {Object<String, _CommandLocaleRoot>} commands Command-specific localization
 */

/**
 * 
 * @param {Object} obj
 * @param {String} rootPath
 * @param {String|String[]} pathToTraverse
 * @param {Boolean} toString
 * @returns {{ value: String|Object|undefined, path: String }}
 */
const _TraverseObject = (obj, rootPath, pathToTraverse) => {
    /** @type {String[]} */
    const pathComponents = Array.isArray(pathToTraverse) ? pathToTraverse : pathToTraverse.split(".");
    if (pathComponents.length === 0) {
        return {
            "value": obj,
            "path": rootPath
        };
    }

    let currentValue = obj;
    let currentPath = rootPath;

    for (let i = 0; i < pathComponents.length; i++) {
        if (typeof ( currentValue ?? undefined ) !== "object") {
            return {
                "value": null,
                "path": currentPath
            };
        }
        
        const pathComponent = pathComponents[i];
        currentPath += (currentPath.length === 0 ? "" : ".") + pathComponent;
        currentValue = currentValue[pathComponent];
    }

    return {
        "value": currentValue,
        "path": currentPath
    };
};

class Locale {
    /**
     * Creates a new Locale Instance
     * @param {_LocaleRoot} root The Root of the Locale (Should be the same for all Locales)
     * @param {String} localeName The name of the Locale
     * @param {String} localePath The path to the current Locale relative to root
     * @param {Object} locale The actual Locale
     */
    constructor(root, localeName, localePath, locale) {
        this._root = root;
        this._localeName = localeName;
        this._localePath = localePath;
        this._locale = locale;
    }

    /**
     * Gets a value from the Locale
     * @param {String|String[]} path The path to the Locale value to get
     * @param {Boolean} toString Whether or not to convert the value to a String ( Or path to the value if none was found )
     * @returns {String} The value at path
     */
    Get(path, toString = true) {
        const tResults = _TraverseObject(this._locale, this._localePath, path);
        const value = tResults.value ?? tResults.path;
        return toString ? ("" + value) : value;
    }

    /**
     * Gets a value from the Locale and formats it
     * @param {String|String[]} path The path to the Locale value to get
     * @param {...Any} formats The formats to format the value with
     * @returns {String} The formatted value at path
     */
    GetFormatted(path, ...formats) {
        return Utils.FormatString(
            this.Get(path, true), ...formats
        );
    }

    /**
     * Gets a value from the Common Locale
     * @param {String|String[]} path The path to the Locale value to get
     * @param {Boolean} toString Whether or not to convert the value to a String ( Or path to the value if none was found )
     * @returns {String} The value at path
     */
    GetCommon(path, toString = true) {
        const tResults = _TraverseObject(this._root.common, "common", path);
        const value = tResults.value ?? tResults.path;
        return toString ? ("" + value) : value;
    }

    /**
     * Gets a value from the Common Locale and formats it
     * @param {String|String[]} path The path to the Locale value to get
     * @param {...Any} formats The formats to format the value with
     * @returns {String} The formatted value at path
     */
    GetCommonFormatted(path, ...formats) {
        return Utils.FormatString(
            this.GetCommon(path, true), ...formats
        );
    }

    /**
     * Gets a sublocale from the Locale
     * @param {String|String[]} path The path to the sublocale
     * @param {Boolean} relativePath Whether or not the path is absolute
     * @returns {Locale?} The found Locale or null if none
     */
    GetSubLocale(path, relativePath = true) {
        const subLocale = _TraverseObject(
            relativePath ? this._locale : this._root,
            relativePath ? this._localePath : "",
            path, false
        );

        if (typeof ( subLocale.value ?? undefined ) === "object")
            return new Locale(this._root, this._localeName, subLocale.path, subLocale.value);
        return null;
    }

    /**
     * Gets a Command Locale from the Locale
     * @param {String|String[]} path The path to the Command ( e.g. "sound.play" )
     * @param {Boolean} relativePath Whether or not the path is absolute
     * @returns {Locale?} The found Command Locale or null if none
     */
    GetCommandLocale(path, relativePath = true) {
        /** @type {String[]} */
        const commandPathComponents = Array.isArray(path) ? path : path.split(".");
        if (commandPathComponents.length === 0 ||
            ( this._locale.subcommands ?? undefined ) === undefined) return null;

        const fullPath = [
            relativePath && this._root !== this._locale ? "subcommands" : "commands",
            commandPathComponents[0]
        ];

        for (let i = 1; i < commandPathComponents.length; i++) {
            fullPath.push(
                "subcommands",
                commandPathComponents[i]
            );
        }

        const commandLocale = _TraverseObject(
            relativePath ? this._locale : this._root,
            relativePath ? this._localePath : "",
            fullPath, false
        );

        if (typeof ( commandLocale.value ?? undefined ) !== "object") return null;

        return new Locale(
            this._root, this._localeName,
            commandLocale.path,
            commandLocale.value
        );
    }
}

/**
 * Returns the specified locale or the default one if not present
 * @param {String} localeName The locale to load
 * @returns {Locale} The specified Locale
 */
const GetLocale = (localeName) => {
    return _Locales[localeName] ?? _Locales[DEFAULT_LOCALE];
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
 * @param {String|String[]} localeName The name of the Locale to get the {@link Locale} from
 * @param {String|String[]} commandPath The path to the Command
 * @returns {Locale} The Locale for the Command
 */
const GetCommandLocale = (localeName, commandPath) => {
    const locale = GetLocale(localeName);
    return locale.GetCommandLocale(commandPath, false);
};

module.exports = { DEFAULT_LOCALE, Locale, RegisterLocales, GetLocale, GetCommandLocale, HasLocale, GetAvailableLocales };
