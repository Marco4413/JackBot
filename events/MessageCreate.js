const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

const _MessageManagers = [
    require("./MessageCreate/CommandManager.js"),
    require("./MessageCreate/CounterManager.js")
];

module.exports = CreateEventListener(
    "messageCreate", async msg => {
        if (msg.author.bot || msg.channel.type !== "GUILD_TEXT" || msg.deleted) return;

        const guild = await Database.GetOrCreateRow("guild", { "id": msg.guildId });
        for (let i = 0; i < _MessageManagers.length; i++) {
            if (await _MessageManagers[i](msg, guild)) return;
        }
    }
);
