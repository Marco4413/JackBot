const fs = require("fs");
const {
    Message, MessageEmbed, MessageReaction,
    EmojiIdentifierResolvable, MessagePayload,
    ReplyMessageOptions, DataManager, BaseFetchOptions,
    Collection
} = require("discord.js");
const DayJS = require("dayjs");

/**
 * Safely replies to the specified message (Catches errors and returns null if one was thrown)
 * @param {Message} msg The message to reply to
 * @param {String|MessagePayload|ReplyMessageOptions} options The reply to send
 * @returns {Promise<Message<Boolean>|null>} The reply message or null if an error was thrown
 */
const SafeReply = async (msg, options) => {
    try {
        return await msg.reply(options);
    } catch (error) {
        return null;
    }
};

/**
 * Safely reacts to the specified message (Catches errors and returns null if one was thrown)
 * @param {Message} msg The message to react to
 * @param {EmojiIdentifierResolvable} emoji The emoji to react with
 * @returns {Promise<MessageReaction|null>} The reaction or null if an error was thrown
 */
const SafeReact = async (msg, emoji) => {
    try {
        return await msg.react(emoji);
    } catch (error) {
        return null;
    }
};

/**
 * Safely deletes the specified message (Catches errors and returns null if one was thrown)
 * @param {Message} msg The message to delete
 * @returns {Promise<Message<Boolean>|null>} The deleted message or null if an error was thrown
 */
const SafeDelete = async (msg) => {
    try {
        return await msg.delete();
    } catch (error) {
        return null;
    }
};

/**
 * Fetches a value from the specified {@link DataManager} (Using fetch as a fallback to resolve)
 * @template {Object} K
 * @template {Object} Holds The type of the fetched value
 * @template {Object} R The type of the key to fetch the value with
 * @param {DataManager<K, Holds, R>} fetchable A fetchable {@link DataManager}
 * @param {R} query The query to fetch the value with
 * @param {BaseFetchOptions} [cacheOptions] Cache options (When fetch fallback is used)
 * @returns {Promise<Holds?>} The value fetched from the {@link DataManager}
 */
const SafeFetch = async (fetchable, query, cacheOptions = { "cache": true }) => {
    const result = fetchable.resolve(query);
    if (result != null) return result;

    try {
        const fetched = await fetchable.fetch(query, cacheOptions);
        if (fetched instanceof Collection)
            return fetched.get(query) ?? null;
        return fetched;
    } catch (error) {
        return null;
    }
};

/**
 * Checks if the specified string is a valid value for an embed field
 * @param {String} str The string to test
 * @returns {Boolean} Whether or not the specified string is a valid value for an embed field
 */
const IsValidEmbedValue = (str) => str != null && str.length <= 1024; 

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
 * Formats the specified String with the specified Map of Formats
 * @param {String} str The String to Format
 * @param {Record<String, Any>} formats The Map of Formats to format the String with
 * @returns {String} The formatted String
 */
const MapFormatString = (str, formats) => {
    return str.replace(/{([^}]+)}/g, (match, key) => {
        return formats[key] ?? key;
    });
};

/**
 * Tested at https://jsben.ch/Vy7s5 and it's x2 the Speed of {@link Array.prototype.join}
 * and it gives the option to manipulate elements
 * @template {Any} T The type of the elements in the Array
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
    return array[ Math.min( Math.floor(Math.random() * array.length), array.length - 1 ) ];
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
const _DateNumberFormatter = (number, digits, fillerDigit = "0") => fillerDigit.repeat(Math.max(digits - ("" + number).length, 0)) + number;

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
        "date": JoinArray([ date.getFullYear(), date.getMonth() + 1, date.getDate() ], dateSep, n => _DateNumberFormatter(n, 2)),
        "time": JoinArray([ date.getHours(), date.getMinutes(), date.getSeconds() ], timeSep, n => _DateNumberFormatter(n, 2))
            + millisSep + _DateNumberFormatter(date.getMilliseconds(), 3)
    };
};

/** @typedef {import("./Localization.js").Locale} Locale */

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
 * Creates a mention to the specified Channel
 * @param {String} channelId The Id of the Channel to create the mention for
 * @returns {String} The mention for the specified Channel
 */
const MentionChannel = (channelId) => {
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
 * @param {T} [defaultValue] The default value to return if valueConverter returns undefined
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


// TODO: Maybe make a generic method to filter files by an array of extensions
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
 * @param {String} str
 * @param {String} seq
 */
const _TrimEnd = (str, seq) => {
    while (str.endsWith(seq))
        str = str.substring(0, str.length - seq.length);
    return str;
};

/**
 * Joins paths into one keeping the "./" sequence at the start of the path if present
 * @param {String[]} paths The paths to join
 * @returns {String} The joined paths
 */
const JoinPath = (...paths) =>
    JoinArray(paths, "/", el => _TrimEnd(el, "/"));

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
        if (fileMatch != null) {
            const fullPath = JoinPath(dirPath, fileMatch[0]);
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

const _IMAGE_URL_MATCHER = /((?:https?:\/\/)(?:www\.)?[^\s?]+\.(?:jpe?g|gifv?|png|webp|bmp|tiff?))/;

/**
 * Matches a String for an image url
 * @param {String} str The String to Match
 * @returns {String?} The Url or null if no match
 */
const MatchImageUrl = (str) => {
    const imageMatch = _IMAGE_URL_MATCHER.exec(str);
    if (imageMatch != null)
        return imageMatch[0];
    else return null;
};

const _DISCORD_SPECIAL_CHARACTERS_MATCHER = /([\\*_<>@~`])/g;

/**
 * @param {String} str
 * @returns {String}
 */
const EscapeDiscordSpecialCharacters = (str) =>
    str.replace(_DISCORD_SPECIAL_CHARACTERS_MATCHER, "\\$1");

/**
 * Checks if a string ends with the specified one, if that's not the case it appends the end to it
 * @param {String} str The string to check
 * @param {String} end The end to check for and to add if not present
 * @returns {String} The complete string
 */
const EndsWithOrAdd = (str, end) => str.endsWith(end) ? str : (str + end);

/**
 * Makes the first character of a string upper-cased
 * @param {String} str The string to capitalize
 * @returns {String} The capitalized string
 */
const Capitalize = str => str.substring(0, 1).toUpperCase() + str.substring(1);

const _DATE_OFFSET_MATCHER = /^([\d-+e.]+)\s*([a-z]+)$/i;

/**
 * Parses a date using dayjs.
 * @param {String} datestr
 * The string to generate the date from.
 * This can also specify an offset like "1 days" which will return tomorrow as a date.
 * @returns {Date?} A Date object if the specified Date String is valid
 */
const ParseDate = (datestr) => {
    const offMatch = _DATE_OFFSET_MATCHER.exec(datestr);
    if (offMatch == null) {
        const date = DayJS(datestr, { "utc": true });
        return date.isValid() ? date.toDate() : null;
    }

    const dt = Number.parseFloat(offMatch[1]);
    if (Number.isNaN(dt)) return null;
    
    const du = offMatch[2];
    const offDate = DayJS(undefined, { "utc": true }).add(dt, du);
    return offDate.isValid() ? offDate.toDate() : null;
};

/** @type {Record<String, Boolean>} */
const _LOCKED_TASKS = { };

/**
 * Checks if the task with the specified id is locked
 * @param {...Any} taskId The id of the task
 * @returns {Boolean} Whether or not the task is locked
 */
const IsTaskLocked = (...taskId) => {
    const _taskId = JoinArray(taskId, ":");
    return _LOCKED_TASKS[_taskId] === true;
};

/**
 * Returns a promise which is resolved once the task is unlocked and locks it again
 * NOTE: This doesn't support multi-threading this is supposed to be used with async tasks
 * @param {Number} [checkInterval] The interval (ms) at which to check if the task was unlocked
 * @param {...Any} taskId The id of the task
 * @returns {Promise<Void>} The promise which is resolved one the task is reserved
 */
const TimedLockTask = (checkInterval = 2.5e3, ...taskId) => {
    const _taskId = JoinArray(taskId, ":");

    if (!IsTaskLocked(_taskId)) {
        _LOCKED_TASKS[_taskId] = true;
        return;
    }
    
    return new Promise(
        resolve => {
            const checker = () => {
                setTimeout(() => {
                    if (!IsTaskLocked(_taskId)) {
                        _LOCKED_TASKS[_taskId] = true;
                        resolve();
                    } else checker();
                }, checkInterval);
            };
            checker();
        }
    );
};

/**
 * Returns a promise which is resolved once the task is unlocked and locks it again
 * NOTE: This doesn't support multi-threading this is supposed to be used with async tasks
 * @param {...Any} taskId The id of the task
 * @returns {Promise<Void>} The promise which is resolved one the task is reserved
 */
const LockTask = (...taskId) =>
    TimedLockTask(undefined, ...taskId);

/**
 * Unlocks the specified task
 * @param {...Any} taskId The task to unlock
 */
const UnlockTask = (...taskId) => {
    const _taskId = JoinArray(taskId, ":");
    _LOCKED_TASKS[_taskId] = undefined;
};

/**
 * Returns a list of all currently locked tasks
 * @returns {String[]} All locked tasks
 */
const GetLockedTasks = () =>
    Object.keys(_LOCKED_TASKS);

module.exports = {
    SafeReply, SafeReact, SafeDelete, SafeFetch,
    IsValidEmbedValue, FormatString, MapFormatString,
    JoinArray, GetRandomArrayElement,
    GetDefaultEmbedForMessage, GetFormattedDateComponents,
    IsNaN,
    MentionUser, MentionChannel, MentionRole,
    GetEnvVariable, AnyToNumber,
    IsFile, IsDirectory, JoinPath, GetAudioFilesInDirectory,
    MatchImageUrl, EndsWithOrAdd, Capitalize,
    EscapeDiscordSpecialCharacters,
    ParseDate,
    IsTaskLocked, TimedLockTask, LockTask, UnlockTask, GetLockedTasks
};
