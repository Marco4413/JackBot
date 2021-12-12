const discord = require("discord.js");

/**
 * @typedef {Object} EventListener
 * @property {String} event
 * @property {(...args: any) => void} callback
 * @property {Boolean} [once]
 */

/**
 * @template {keyof discord.ClientEvents} T
 * @param {T} event
 * @param {(...args: discord.ClientEvents[T]) => void} callback
 * @returns {EventListener}
 */
const CreateEventListener = (event, callback, once = false) => {
    return { event, callback, once };
};

module.exports = { CreateEventListener };
