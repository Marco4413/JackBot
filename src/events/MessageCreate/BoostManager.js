const { SendNitroBoostEmbed } = require("../../commands/utils/BoostUtils.js");
const { Message, MessageType } = require("discord.js");

/**
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @returns {Promise<Boolean>}
 */
module.exports = async (msg, guild) => {
    if (msg.member != null) {
        switch (msg.type) {
        case MessageType.GuildBoost:
        case MessageType.GuildBoostTier1:
        case MessageType.GuildBoostTier2:
        case MessageType.GuildBoostTier3:
            await SendNitroBoostEmbed(msg.member);
            return true;
        }
    }
    return false;
};
