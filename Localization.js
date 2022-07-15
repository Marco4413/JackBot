const fs = require("fs");
const { Utils } = require("./Command.js");
const { MAX_LOCALE_NAME_LENGTH, GuildModel } = require("./DatabaseDefinitions.js");
const Logger = require("./Logger.js");

/** The Default Locale that should always be present */
const DEFAULT_LOCALE = GuildModel.locale.defaultValue;
/** @type {Object<String, Locale>} */
const _Locales = { };

const _LOCALES_FOLDER = "./localization";

/**
 * Registers all Locales found in the localization folder
 */
const RegisterLocales = () => {
    fs.readdirSync(_LOCALES_FOLDER).forEach(file => {
        if (file.endsWith(".json")) {
            const localeName = file.substring(0, file.length - ".json".length);
            if (localeName.length <= MAX_LOCALE_NAME_LENGTH) {
                const jsonLocale = require(`${_LOCALES_FOLDER}/${file}`);
                _Locales[localeName] = new Locale(
                    jsonLocale, localeName, "", jsonLocale
                );

                Logger.Info(`Locale "${localeName}" registered!`);
            } else {
                Logger.Warn(`Locale "${localeName}" couldn't be loaded because its name exceeds the max locale name length of ${MAX_LOCALE_NAME_LENGTH}.`);
            }
        }
    });

    if (_Locales[DEFAULT_LOCALE] == null)
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

const _EXTENDS_MATCHER = /^#extends\s*([^;]+)/g;

/**
 * 
 * @param {Object} obj
 * @param {String} rootPath
 * @param {String|String[]} pathToTraverse
 * @param {Boolean} toString
 * @returns {{ value: String|Object|undefined, path: String }}
 */
const _TraverseObject = (obj, rootPath, pathToTraverse) => {
    const traversal = {
        "value": obj,
        "path": rootPath
    };

    /** @type {String[]} */
    const pathComponents = Array.isArray(pathToTraverse) ? pathToTraverse : pathToTraverse.split(".");
    for (let i = 0; i < pathComponents.length; i++) {
        const pathComponent = pathComponents[i];
        traversal.path += (traversal.path.length === 0 ? "" : ".") + pathComponent;

        const valueType = typeof ( traversal.value[pathComponent] ?? undefined );
        if (valueType === "string") {
            const extendsMatch = _EXTENDS_MATCHER.exec(traversal.value[pathComponent]);
            if (extendsMatch == null) {
                traversal.value = i === pathComponents.length - 1 ? traversal.value[pathComponent] : null;
                return traversal;
            } else {
                try {
                    const extendPath = `${_LOCALES_FOLDER}/${extendsMatch[1]}`;
                    traversal.value[pathComponent] = require(Utils.EndsWithOrAdd(extendPath, ".json"));
                    traversal.value = traversal.value[pathComponent];
                } catch (error) {
                    Logger.Error(error);
                    traversal.value = null;
                    return traversal;
                }
            }
        } else if (valueType !== "object") {
            traversal.value = null;
            return traversal;
        } else {
            traversal.value = traversal.value[pathComponent];
        }
    }

    return traversal;
};

const _SIGNED_NUMBER_FORMAT = new Intl.NumberFormat("it-it", {
    signDisplay: "exceptZero"
});

const _UNSIGNED_NUMBER_FORMAT = new Intl.NumberFormat("it-it", {
    signDisplay: "auto"
});

const _SIGN_MAP = {
    [ 1 ]: "+",
    [ 0 ]:  "",
    [-1 ]: "-",
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
     * Gets a value from the Locale and formats it using a map
     * @param {String|String[]} path The path to the Locale value to get
     * @param {Record<String, Any>} formats The map of formats to format the value with
     * @returns {String} The formatted value at path
     */
    GetFormatted(path, formats) {
        return Utils.MapFormatString(
            this.Get(path, true), formats
        );
    }

    /**
     * Creates a Formatted list from the specified Array
     * @template {Any} T Entry type
     * @param {T[]} entries The Entries to list
     * @param {String?} [path] The path of the locale to use to format each entry
     * @param {(entry: T) => Record<String, Any>} [formatter] A function which returns the formats to use with the locale string at path
     * @param {String?} [titlePath] The path to the locale to use as the title of the list
     * @returns {String} The Formatted List
     */
    GetFormattedList(entries, path = null, formatter = value => ({ value }), titlePath = null) {
        const title = titlePath == null ?
            "" :
            (this.Get(titlePath) + "\n");
        return title + Utils.JoinArray(
            entries, "\n", entry =>
                this.GetCommonFormatted(
                    "listEntry", {
                        "value": path == null ?
                            formatter(entry).value :
                            this.GetFormatted(
                                path, formatter(entry)
                            )
                    }
                )
        );
    }

    /**
     * Creates an Inline Formatted list from the specified Array
     * @template {Any} T Entry type
     * @param {T[]} entries The Entries to list
     * @param {String?} [path] The path of the locale to use to format each entry
     * @param {(entry: T) => Record<String, Any>} [formatter] A function which returns the formats to use with the locale string at path
     * @param {String?} [titlePath] The path to the locale to use as the title of the list
     * @returns {String} The Formatted List
     */
    GetFormattedInlineList(entries, path = null, formatter = value => ({ value }), titlePath = null) {
        const title = titlePath == null ?
            "" :
            (this.Get(titlePath) + "\n");
        return title + this.GetCommonFormatted(
            "listDelimiter", {
                "list": Utils.JoinArray(
                    entries,
                    this.GetCommon("listSeparator"),
                    entry => path == null ?
                        formatter(entry).value :
                        this.GetFormatted(
                            path, formatter(entry)
                        )
                )
            }
        );
    }

    /**
     * Gets the specified User, Role or Channel's Soft Mention
     * @param {"User"|"Role"|"Channel"} type The type to get the Soft Mention for
     * @param {String?} name The name for the Soft Mention
     * @param {String} id The id for the Soft Mention
     * @param {Boolean} [isListEntry] Whether or not this should be a list entry
     * @returns {String} The Soft Mention
     */
    GetSoftMention(type, name, id, isListEntry) {
        const softMention = this.GetCommonFormatted(
            "softMention", {
                "name": name ?? this.GetCommon(`unknown${type}`),
                id
            }
        );

        return isListEntry ? this.GetCommonFormatted(
            "listEntry", { "value": softMention }
        ) : softMention;
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
     * Gets a value from the Common Locale and formats it using a map
     * @param {String|String[]} path The path to the Locale value to get
     * @param {Record<String, Any>} formats The map of formats to format the value with
     * @returns {String} The formatted value at path
     */
    GetCommonFormatted(path, formats) {
        return Utils.MapFormatString(
            this.GetCommon(path, true), formats
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
        const subKey = relativePath && this._root !== this._locale ? "subcommands" : "commands";
        if (commandPathComponents.length === 0 ||
            // We don't even bother to search for a Command if there can't be any
            ( this._locale[subKey] ) == null) return null;

        const fullPath = [
            subKey, commandPathComponents[0]
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
    
    /**
     * Translates the specified Number
     * @param {Any} n The Number to translate
     * @returns {String} The translated Number
     */
    TranslateNumber(n, digitsSeparator = false, keepSign = false) {
        if (Utils.IsNaN(n)) {
            return this.GetCommon("nan");
        } else if (n === Number.POSITIVE_INFINITY) {
            return this.GetCommon("positiveInfinity");
        } else if (n === Number.NEGATIVE_INFINITY) {
            return this.GetCommon("negativeInfinity");
        }

        if (digitsSeparator)
            return keepSign ? _SIGNED_NUMBER_FORMAT.format(n) : _UNSIGNED_NUMBER_FORMAT.format(n);
        return keepSign ? (_SIGN_MAP[Math.sign(n)] + Math.abs(n)) : n.toString();
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
