const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");
const { GetCommandLocale } = require("../Localization.js");
const { MentionUser } = require("../Utils");
const { DatabaseDefinitions } = require("../Command.js");

module.exports = CreateEventListener(
    "messageDelete", async msg => {
        if (msg.channel.type !== "GUILD_TEXT") return;
        
        const counter = await Database.GetRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId, "lastMessageId": msg.id });
        if (counter === undefined) return;

        const counterStartValue = DatabaseDefinitions.CounterModel.count.defaultValue;
        
        const guild = await Database.GetOrCreateRow("guild", { "id": msg.guildId });
        const locale = GetCommandLocale(guild.locale, [ "counter" ]);

        let counterMessage;
        if (counter.count === counterStartValue) {
            counterMessage = await msg.channel.send(counterStartValue.toString());
        } else {
            counterMessage = await msg.channel.send(locale.GetFormatted(
                "messageDeleted", {
                    "count": counter.count,
                    "user-mention": MentionUser(counter.lastMemberId)
                }
            ));
        }

        await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
            "lastMessageId": counterMessage.id
        });

        await counterMessage.react(locale.GetCommon("checkmark"));
    }
);
