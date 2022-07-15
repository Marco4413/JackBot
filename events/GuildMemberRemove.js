const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

const _DELETE_USERS_ON_LEAVE = process.env["DELETE_USERS_ON_LEAVE"] !== "false";
module.exports = CreateEventListener(
    "guildMemberRemove", async member => {
        if (_DELETE_USERS_ON_LEAVE)
            await Database.RemoveRows("user", { "guildId": member.guild.id, "userId": member.id });
    }
);
