const fs = require("fs");
const { parseFile } = require("music-metadata");
const { Message, MessageEmbed } = require("discord.js");
const path = require("path");

/**
 * Formats the specified String with the specified Formats
 * @param {String} str The String to Format
 * @param {...Any} formats The Formats to format the String with
 * @returns {String} The formatted String
 */
const FormatString = (str, ...formats) => {
    if (formats.length === 0) return str;
    return str.replace(/{(\d+)}/g, (match, number) => {
        const index = Number.parseInt(number);
        return index < formats.length ? formats[index] : match;
    });
};

/**
 * Tested at https://jsben.ch/Vy7s5 and it's x2 the Speed of {@link Array.prototype.join}
 * and it gives the option to manipulate elements
 * @template {T} The type of the elements in the Array
 * @param {T[]} array The Array to Join
 * @param {String} [separator] The separator used to separate Array elements
 * @param {(el: T, index: Number) => Any} [elFormatter] Called to format every element in the Array
 * @returns {String} The Joint Array Elements
 */
const JoinArray = (array, separator = ",", elFormatter = el => el) => {
    const output = array.reduce((prev, next, index) => {
        if (prev === undefined) return "" + elFormatter(next, index);
        return prev + separator + elFormatter(next, index);
    }, undefined);
    return output === undefined ? "" : output;
};

/**
 * Returns a random element from the specified array
 * @template {Object} T
 * @param {T[]} array The array to get the random element from
 * @returns {T|undefined} The random element taken from the specified array or undefined if its length is 0
 */
const GetRandomArrayElement = (array) => {
    if (array.length === 0) return undefined;
    return array[ Math.round(Math.random() * ( array.length - 1 )) ];
};

/**
 * Returns the Default Embed for the Specified Message
 * @param {Message} msg The Message to create the Embed from
 * @param {boolean} [addThumbnail] Whether or not to add a Thumbnail to the Embed
 * @returns {MessageEmbed} The Default Embed for the Specified Message
 */
const GetDefaultEmbedForMessage = (msg, addThumbnail = false) => {
    const botAvatar = msg.guild.me.displayAvatarURL();
    return new MessageEmbed({
        "author": {
            "iconURL": msg.member.displayAvatarURL(),
            "name": msg.member.displayName
        },
        "color": "GOLD",
        "thumbnail": addThumbnail ? { "url": botAvatar } : undefined,
        "timestamp": Date.now(),
        "footer": {
            "iconURL": botAvatar,
            "text": msg.guild.me.displayName
        }
    });
};

/** @param {Number} number */
const _NumberFormatter = (number, digits, fillerDigit = "0") => fillerDigit.repeat(Math.max(digits - ("" + number).length, 0)) + number;

/**
 * Gets the formatted components of the specified Date
 * @param {Date} [date] The Date to get the components of
 * @param {String} [dateSep] The separator for the Date Component
 * @param {String} [timeSep] The separator for the Time Component
 * @param {String} [millisSep] The separator used between Seconds and Milliseconds
 * @returns {{ date: String, time: String }} The formatted components of the Date
 */
const GetFormattedDateComponents = (date = new Date(), dateSep = "/", timeSep = ":", millisSep = ".") => {
    return {
        "date": JoinArray([ date.getFullYear(), date.getMonth() + 1, date.getDate() ], dateSep, n => _NumberFormatter(n, 2)),
        "time": JoinArray([ date.getHours(), date.getMinutes(), date.getSeconds() ], timeSep, n => _NumberFormatter(n, 2))
            + millisSep + _NumberFormatter(date.getMilliseconds(), 3)
    };
};

/** @typedef {import("./Localization.js").CommandLocale} CommandLocale */

/**
 * Translates the specified Number using the specified Locale
 * @param {Any} n The Number to translate
 * @param {CommandLocale} locale The locale to translate the Number with
 * @returns {String} The translated Number
 */
const TranslateNumber = (n, locale) => {
    if (IsNaN(n)) {
        return locale.common.nan;
    } else if (n === Number.POSITIVE_INFINITY) {
        return locale.common.positiveInfinity;
    } else if (n === Number.NEGATIVE_INFINITY) {
        return locale.common.negativeInfinity;
    }
    return n.toString();
};

/**
 * Same as Number.isNaN but with type checking
 * @param {Any} n The Number to check if it's NaN
 * @returns {Boolean} Whether or not the Number is not NaN and of a Number type
 */
const IsNaN = (n) => {
    const nType = typeof n;
    return Number.isNaN(n) || nType !== "number" && nType !== "bigint";
};

/**
 * Creates a mention to the specified User
 * @param {String} userId The Id of the User to create the mention for
 * @returns {String} The mention for the specified User
 */
const MentionUser = (userId) => {
    return `<@${userId}>`;
};

/**
 * Creates a mention to the specified Text Channel
 * @param {String} channelId The Id of the Text Channel to create the mention for
 * @returns {String} The mention for the specified Text Channel
 */
const MentionTextChannel = (channelId) => {
    return `<#${channelId}>`;
};

/**
 * Creates a mention to the specified Role
 * @param {String} roleId The Id of the Role to create the mention for
 * @returns {String} The mention for the specified Role
 */
const MentionRole = (roleId) => {
    return `<@&${roleId}>`;
};

/**
 * Gets the specified environment variable
 * @template {Object} T The type of the variable
 * @param {String} varKey The key of the variable to get
 * @param {(value: Any, defaultValue: T) => T|undefined} [valueConverter] A function that converts the env value to the one needed, returns undefined if the conversion failed
 * @param {T} [defaultValue] The default value to return if the
 * @param {(data: ...Any) => Void} [logger] The logger to log when defaultValue is used
 * @returns {T} The value of the Environment Variable
 */
const GetEnvVariable = (varKey, valueConverter = v => v, defaultValue, logger = console.warn) => {
    const varValue = valueConverter(process.env[varKey], defaultValue);
    if (varValue === undefined) {
        if (defaultValue === undefined)
            throw new TypeError(`Field ${varKey} in .env is of the wrong type`);
        logger(`Field ${varKey} in .env is of the wrong type, using the default value of ${defaultValue}`);
        return defaultValue;
    }
    return varValue;
};

/**
 * Converts a value to a Number or undefined if NaN
 * @param {Any} value The value to convert to a Number
 * @returns {Number|undefined} Value to Number or undefined if NaN
 */
const AnyToNumber = (value) => {
    const asNumber = Number(value);
    if (IsNaN(asNumber)) return undefined;
    return asNumber;
};


// TODO: Maybe make a generic method to fitler files by an array of extensions
const _AUDIO_EXTENSIONS = [ "mp3", "wav" ];
const _AUDIO_REGEXP = new RegExp(`^(.+)\\.(${JoinArray(_AUDIO_EXTENSIONS, "|")})$`);

/**
 * Checks if the specified path points to a file
 * @param {String} filePath The path to the file to check
 * @returns {Boolean} Whether or not the specified path points to a file
 */
const IsFile = (filePath) => {
    return fs.lstatSync(filePath, { "throwIfNoEntry": false })?.isFile() ?? false;
};

/**
 * Checks if the specified path points to a directory
 * @param {String} filePath The path to the directory to check
 * @returns {Boolean} Whether or not the specified path points to a directory
 */
const IsDirectory = (dirPath) => {
    return fs.lstatSync(dirPath, { "throwIfNoEntry": false })?.isDirectory() ?? false;
};

/**
 * @typedef {Object} FileInfo Information about a specific File
 * @property {String} name The name of the file ( With no extension )
 * @property {String} extension The extension of the file ( Without the dot )
 * @property {String} path The path to the file relative to its root ( Usually the full file name )
 * @property {String} fullPath The full path to the file
 */

/**
 * Returns all audio files from the specified directory ( Valid Audio Extensions are Specified in {@link _AUDIO_EXTENSIONS} )
 * @param {String} dirPath The path to the directory to query
 * @returns {FileInfo[]} A list of all audio files in the specified dir or 0 if either there's none or the dir doesn't exist
 */
const GetAudioFilesInDirectory = (dirPath) => {
    if (!IsDirectory(dirPath)) return [ ];

    const validFiles = [ ];
    const allFiles = fs.readdirSync(dirPath);
    for (let i = 0; i < allFiles.length; i++) {
        const fileMatch = _AUDIO_REGEXP.exec(allFiles[i]);
        if (fileMatch !== null) {
            const fullPath = path.join(dirPath, fileMatch[0]);
            if (IsFile(fullPath)) {
                validFiles.push({
                    "name": fileMatch[1],
                    "extension": fileMatch[2],
                    "path": fileMatch[0],
                    "fullPath": fullPath
                });
            }
        }
    }

    return validFiles;
};

module.exports = {
    FormatString,
    JoinArray, GetRandomArrayElement,
    GetDefaultEmbedForMessage, GetFormattedDateComponents,
    TranslateNumber, IsNaN,
    MentionUser, MentionTextChannel, MentionRole,
    GetEnvVariable, AnyToNumber,
    IsFile, IsDirectory, GetAudioFilesInDirectory
};
