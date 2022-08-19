const { SendNitroBoostEmbed } = require("../../commands/utils/BoostUtils.js");
const { Message } = require("discord.js");

/**
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @returns {Promise<Boolean>}
 */
module.exports = async (msg, guild) => {
    if (msg.type.startsWith("USER_PREMIUM_GUILD_SUBSCRIPTION") && msg.member != null) {
        await SendNitroBoostEmbed(msg.member);
        return true;
    }
    return false;
};
