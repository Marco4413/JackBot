const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "guildDelete", async guild => {
        await Database.RemoveRows("guild", { "id": guild.id });
        await Database.RemoveRows("counter", { "guildId": guild.id });
    }
);
