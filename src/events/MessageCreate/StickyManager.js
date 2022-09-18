const { Message } = require("discord.js");
const Utils = require("../../Utils.js");
const Database = require("../../Database.js");
const Logger = require("../../Logger.js");

const _STICKY_MESSAGE_COOLDOWN = Utils.GetEnvVariable("STICKY_MESSAGE_COOLDOWN", Utils.AnyToNumber, 2.5e3, Logger.Warn);

/**
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @returns {Promise<Boolean>}
 */
module.exports = async (msg, guild) => {
    const channelRow = await Database.GetRow("channel", {
        "guildId": msg.guildId, "channelId": msg.channelId
    });

    if (channelRow?.stickyMessageId != null) {
        if (msg.id === channelRow.stickyMessageId) return true;

        const timeSinceLastChange = (
            Date.now() - channelRow.updatedAt.getTime()
        );

        if (timeSinceLastChange >= _STICKY_MESSAGE_COOLDOWN) {
            const stickyMessage = await Utils.SafeFetch(msg.channel.messages, channelRow.stickyMessageId);
            if (stickyMessage != null) {
                await Utils.SafeDelete(stickyMessage);
                const newStickyMessage = stickyMessage.content.length > 0 ?
                    await msg.channel.send(stickyMessage.content) :
                    await msg.channel.send({ "embeds": [ stickyMessage.embeds[0] ] });
    
                await Database.SetRowAttr("channel", {
                    "guildId": msg.guildId, "channelId": msg.channelId
                }, { "stickyMessageId": newStickyMessage.id });
            } else {
                await Database.SetRowAttr("channel", {
                    "guildId": msg.guildId, "channelId": msg.channelId
                }, { "stickyMessageId": null });
            }
        }
    }

    return false;
};
