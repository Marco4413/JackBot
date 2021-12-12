const fs = require("fs");
const { Client: DiscordClient, Intents } = require("discord.js");

const Client = new DiscordClient({
    "intents": Intents.FLAGS.GUILDS | Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_MEMBERS
});

Client.token = process.env["TOKEN"];

Client.once("ready", () => {
    console.log("Bot Ready!");
});

process.once("SIGINT", () => {
    Client.destroy();
    console.log("Bot Destroyed.");
});

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
            }
        }
    });
};

module.exports = {
    Client, RegisterEventListeners
};
