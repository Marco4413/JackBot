const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

module.exports = CreateEventListener(
    "roleDelete", async role => {
        await Database.RemoveRows("role", { "guildId": role.guild.id, "roleId": role.id });
    }
);
