const { CreateEventListener } = require("../EventListener.js");
const { RemoveGuild } = require("../Database.js");

module.exports = CreateEventListener(
    "guildDelete", async guild => await RemoveGuild(guild.id)
);
