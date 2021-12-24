const fs = require("fs");
const { Client: DiscordClient, Intents } = require("discord.js");

const Client = new DiscordClient({
    "intents": Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_MEMBERS | Intents.FLAGS.GUILD_PRESENCES
});

Client.token = process.env["TOKEN"];

Client.once("ready", () => {
    console.log("Bot Ready!");
});

process.once("SIGINT", () => {
    Client.destroy();
    console.log("Bot Destroyed.");
});

/**
 * Registers all Event Listeners found in the Events folder
 */
const RegisterEventListeners = () => {
    const eventsFolder = "./events";
    fs.readdirSync(eventsFolder).forEach(file => {
        if (file.endsWith(".js")) {
            const script = require(`${eventsFolder}/${file}`);
            if (
                typeof script === "object" &&
                typeof script.event === "string" &&
                typeof script.callback === "function"
            ) {
                if (script.once === true) {
                    Client.once(script.event, script.callback);
                } else {
                    Client.on(script.event, script.callback);
                }
                console.info(`Event Listener "${file}" registered to "${script.event}"!`);
            } else {
                console.warn(`Event Listener "${file}" couldn't be loaded because it returned an invalid Event Listener.`);
            }
        }
    });
};

module.exports = {
    Client, RegisterEventListeners
};
