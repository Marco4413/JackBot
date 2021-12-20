const discord = require("discord.js");

/**
 * @typedef {Object} EventListener An Event Listener for the Discord Client
 * @property {String} event The Event to Register to
 * @property {(...args: any) => void} callback The callback for the Event
 * @property {Boolean} [once] Whether or not this Listener should only trigger once
 */

/**
 * Helper function to give better autocompletion when creating EventListeners ( Doesn't check for validity ).
 * Wraps callback to catch errors and print them to the console
 * @template {keyof discord.ClientEvents} T
 * @param {T} event
 * @param {(...args: discord.ClientEvents[T]) => void} callback
 * @returns {EventListener}
 */
const CreateEventListener = (event, callback, once = false) => {
    return {
        event,
        "callback": async (...args) => {
            try {
                await callback(...args);
            } catch (err) {
                console.warn(`Event "${event}" has thrown an exception:\n${err.stack}`);
            }
        },
        once
    };
};

module.exports = { CreateEventListener };
