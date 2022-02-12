const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");
const { CreateVoiceChannel } = require("../commands/utils/ChannelUtils.js");

module.exports = CreateEventListener(
    "voiceStateUpdate", async (_, state) => {
        if (state.member.user.bot || state.channelId === null) return;

        const createChannel = await Database.GetRow("guild", {
            "id": state.guild.id, "privateVoiceCreateChannelId": state.channelId
        }) !== undefined;

        if (createChannel)
            await CreateVoiceChannel(state.member);
    }
);
