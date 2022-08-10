const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "messageUpdate", async msg => {
        if (msg.channel.type !== "GUILD_TEXT") return;
        
        const counter = await Database.GetRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId, "lastMessageId": msg.id });
        if (counter == null) return;
        await msg.delete();
    }
);
