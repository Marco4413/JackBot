const { CreateEventListener } = require("../EventListener.js");

module.exports = CreateEventListener(
    "messageCreate", msg => {
        if (msg.author.bot) return;

        const rand = Math.random();
        if (rand <= 0.1) msg.reply("La Sagra è Iniziata?");
        else if (rand <= 0.2) msg.react("🤔");
    }
);
