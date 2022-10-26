const { ChannelType } = require("discord.js");
const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");

const _MessageManagers = [
    require("./MessageCreate/BoostManager.js"),
    require("./MessageCreate/CommandManager.js"),
    require("./MessageCreate/CounterManager.js")
];

const _StickyManager = require("./MessageCreate/StickyManager.js");

module.exports = CreateEventListener(
    "messageCreate", async msg => {
        if (msg.channel.type !== ChannelType.GuildText) return;
        if (await _StickyManager(msg)) return;
        if (msg.author.bot) return;

        const guild = await Database.GetOrCreateRow("guild", { "id": msg.guildId });
        for (let i = 0; i < _MessageManagers.length; i++) {
            if (await _MessageManagers[i](msg, guild)) return;
        }
    }
);
