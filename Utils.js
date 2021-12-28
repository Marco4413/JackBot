const { Message, MessageEmbed } = require("discord.js");

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
 * @param {String} userId The ID of the User to create the mention for
 * @returns {String} The mention for the specified User
 */
const MentionUser = (userId) => {
    return `<@${userId}>`;
};

/**
 * Creates a mention to the specified Text Channel
 * @param {String} channelId The ID of the Text Channel to create the mention for
 * @returns {String} The mention for the specified Text Channel
 */
const MentionTextChannel = (channelId) => {
    return `<#${channelId}>`;
};

module.exports = { FormatString, JoinArray, GetRandomArrayElement, GetDefaultEmbedForMessage, TranslateNumber, IsNaN, MentionUser, MentionTextChannel };
