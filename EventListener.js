const discord = require("discord.js");

/**
 * @typedef {Object} EventListener An Event Listener for the Discord Client
 * @property {String} event The Event to Register to
 * @property {(...args: any) => void} callback The callback for the Event
 * @property {Boolean} [once] Whether or not this Listener should only trigger once
 */

/**
 * Helper function to give better autocompletion when creating EventListeners ( Doesn't check for validity ).
 * Returns the same value that's given
 * @template {keyof discord.ClientEvents} T
 * @param {T} event
 * @param {(...args: discord.ClientEvents[T]) => void} callback
 * @returns {EventListener}
 */
const CreateEventListener = (event, callback, once = false) => {
    return { event, callback, once };
};

module.exports = { CreateEventListener };
