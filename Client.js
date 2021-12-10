const { Client, Intents } = require("discord.js");

const client = new Client({
    "intents": Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILD_MEMBERS
});

client.token = process.env["TOKEN"];

client.once("ready", () => {
    console.log("Bot Ready!");
});

process.once("SIGINT", () => {
    client.destroy();
    console.log("Bot Destroyed.");
});

module.exports = client;
