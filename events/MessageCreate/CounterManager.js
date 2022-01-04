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
                await msg.delete();
                return true;
            }
            
            const counterStartValue = DatabaseDefinitions.CounterModel.count.defaultValue;
            const locale = GetCommandLocale(guild.locale, [ "counter" ]);
            
            if (result === counter.count + 1) {
                await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
                    "count": result,
                    "bestCount": result > counter.bestCount ? result : counter.bestCount,
                    "lastMemberId": msg.member.id
                });
                
                await msg.react(locale.common.checkmark);
            } else if (!counter.allowErrors) {
                await msg.delete();
            } else if (counter.count !== counterStartValue) {
                await Database.SetRowAttr("counter", { "guildId": msg.guildId, "channelId": msg.channelId }, {
                    "count": counterStartValue,
                    "bestCount": counter.count > counter.bestCount ? counter.count : counter.bestCount,
                    "lastMemberId": msg.member.id
                });

                await msg.channel.send(Utils.FormatString(locale.command.countFailed, Utils.MentionUser(msg.member.id), counter.count));
                await (await msg.channel.send(counterStartValue.toString())).react(locale.common.checkmark);
                await msg.react(locale.common.crossmark);
            }
        } else if (!counter.allowMessages) {
            await msg.delete();
        }

        return true;
    }

    return false;
};
