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

module.exports = { FormatString, JoinArray };
