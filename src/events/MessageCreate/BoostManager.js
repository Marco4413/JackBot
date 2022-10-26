const { SendNitroBoostEmbed } = require("../../commands/utils/BoostUtils.js");
const { Message, MessageType } = require("discord.js");

/**
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @returns {Promise<Boolean>}
 */
module.exports = async (msg, guild) => {
    if (msg.type === MessageType.GuildBoost && msg.member != null) {
        await SendNitroBoostEmbed(msg.member);
        return true;
    }
    return false;
};
