const { SendNitroBoostEmbed } = require("../commands/utils/BoostUtils.js");
const { CreateEventListener } = require("../EventListener.js");

module.exports = CreateEventListener(
    "guildMemberUpdate", async (oldMember, newMember) => {
        if (newMember.roles.premiumSubscriberRole == null ||
            oldMember.premiumSinceTimestamp === newMember.premiumSinceTimestamp) return;
        await SendNitroBoostEmbed(newMember);
    }
);
