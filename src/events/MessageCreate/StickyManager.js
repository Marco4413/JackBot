const { Message } = require("discord.js");
const Utils = require("../../Utils.js");
const Database = require("../../Database.js");
const Logger = require("../../Logger.js");

const _STICKY_MESSAGE_COOLDOWN = Utils.GetEnvVariable("STICKY_MESSAGE_COOLDOWN", Utils.AnyToNumber, 2.5e3, Logger.Warn);

/**
 * @param {Message} msg
 * @returns {Promise<Boolean>}
 */
module.exports = async (msg) => {
    const channelRow = await Database.GetRow("channel", {
        "guildId": msg.guildId, "channelId": msg.channelId
    });

    if (channelRow?.stickyMessageId != null) {
        await Utils.LockTask("StickyManager");
        try {
            if (msg.id === channelRow.stickyMessageId) return true;
    
            const timeSinceLastChange = (
                Date.now() - channelRow.updatedAt.getTime()
            );
    
            if (timeSinceLastChange >= _STICKY_MESSAGE_COOLDOWN) {
                const stickyMessage = await Utils.SafeFetch(msg.channel.messages, channelRow.stickyMessageId);
                if (stickyMessage != null) {
                    await Utils.SafeDelete(stickyMessage);
                    const newStickyMessage = await (stickyMessage.content.length > 0 ?
                        msg.channel.send(stickyMessage.content) :
                        msg.channel.send({ "embeds": [ stickyMessage.embeds[0] ] })
                    );
        
                    await Database.SetRowAttr("channel", {
                        "guildId": msg.guildId, "channelId": msg.channelId
                    }, { "stickyMessageId": newStickyMessage.id });
                } else {
                    Logger.Warn(`Reference to Sticky Message in ${Utils.MentionChannel(channelRow.channelId)}@${channelRow.guildId} was lost.`);
                    await Database.SetRowAttr("channel", {
                        "guildId": msg.guildId, "channelId": msg.channelId
                    }, { "stickyMessageId": null });
                }
            }
        } catch (error) {
            Logger.Error(error);
        } finally {
            Utils.UnlockTask("StickyManager");
        }
    }

    return false;
};
