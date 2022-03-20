const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "channelDelete", async msg => {
        if (msg.channel.type !== "GUILD_TEXT") return;
        await Database.RemoveRows("counter", { "guildId": msg.guildId, "channelId": msg.channelId });
    }
);
