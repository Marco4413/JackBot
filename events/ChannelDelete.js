const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "channelDelete", async channel => {
        if (channel.type !== "GUILD_TEXT") return;
        await Database.RemoveRows("counter", { "guildId": channel.guildId, "channelId": channel.id });
    }
);
