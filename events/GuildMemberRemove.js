const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "guildMemberRemove", async member => {
        await Database.RemoveRows("user", { "guildId": member.guild.id, "userId": member.id });
    }
);
