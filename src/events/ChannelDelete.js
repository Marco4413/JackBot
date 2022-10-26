const { ChannelType } = require("discord.js");
const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "channelDelete", async channel => {
        if (channel.type !== ChannelType.GuildText) return;
        await Database.RemoveRows("counter", { "guildId": channel.guildId, "channelId": channel.id });
    }
);
