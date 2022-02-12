const Discord = require("discord.js");
const Logger = require("./Logger.js");

/**
 * @typedef {Object} EventListener An Event Listener for the Discord Client
 * @property {String} event The Event to Register to
 * @property {(...args: any) => Void} callback The callback for the Event
 * @property {Boolean} [once] Whether or not this Listener should only trigger once
 */

/**
 * Helper function to give better autocompletion when creating EventListeners ( Doesn't check for validity ).
 * Wraps callback to catch errors and print them to the console
 * @template {keyof Discord.ClientEvents} T
 * @param {T} event
 * @param {(...args: Discord.ClientEvents[T]) => Void} callback
 * @returns {EventListener}
 */
const CreateEventListener = (event, callback, once = false) => {
    return {
        event,
        "callback": async (...args) => {
            try {
                await callback(...args);
            } catch (err) {
                Logger.Warn(`Event "${event}" has thrown an exception:\n${err.stack}`);
            }
        },
        once
    };
};

module.exports = { CreateEventListener };
