const { GetCommandLocale } = require("../../Localization.js");
const Database = require("../../Database.js");
const DatabaseDefinitions = require("../../DatabaseDefinitions.js");
const Utils = require("../../Utils.js");

const SMath = require("../../SandMath.js");
const { Message } = require("discord.js");

/**
 * This Module Manages Counters
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @returns {Boolean}
 */
module.exports = async (msg, guild) => {
    const counter = await Database.GetRow("counter", { "guildId": msg.guildId, "channelId": msg.channelId });

    if (counter !== undefined) {
        let result = undefined;
        try {
            result = SMath.evaluate(msg.content);
        } catch (err) { /* Do nothing on error */ }
        
        if (!Utils.IsNaN(result)) {
            if (counter.alternateMember && counter.lastMemberId === msg.member.id) {
                await Utils.SafeDelete(msg);
                return true;
            }
            
            const counterStartValue = DatabaseDefinitions.CounterModel.count.defaultValue;
            const locale = GetCommandLocale(guild.locale, [ "counter" ]);
            
            if (result === counter.count + 1) {
                await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
                    "count": result,
                    "bestCount": result > counter.bestCount ? result : counter.bestCount,
                    "lastMemberId": msg.member.id,
                    "lastMessageId": msg.id
                });
                
                Utils.SafeReact(msg, locale.GetCommon("checkmark"));
            } else if (!counter.allowErrors) {
                await Utils.SafeDelete(msg);
            } else if (counter.count === counterStartValue) {
                await Utils.SafeDelete(msg);
            } else {
                await msg.channel.send(locale.GetFormatted("countFailed", Utils.MentionUser(msg.member.id), counter.count));
                const counterMessage = await msg.channel.send(counterStartValue.toString());
                await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
                    "count": counterStartValue,
                    "bestCount": counter.count > counter.bestCount ? counter.count : counter.bestCount,
                    "lastMemberId": msg.member.id,
                    "lastMessageId": counterMessage.id
                });

                Utils.SafeReact(msg, locale.GetCommon("crossmark"));
                await counterMessage.react(locale.GetCommon("checkmark"));
            }
        } else if (!counter.allowMessages) {
            await Utils.SafeDelete(msg);
        }

        return true;
    }

    return false;
};
