const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");
const { CreateVoiceChannel } = require("../commands/utils/ChannelUtils.js");

module.exports = CreateEventListener(
    "voiceStateUpdate", async (oldState, state) => {
        if (state.member.user.bot || state.channelId === null || oldState.channelId === state.channelId) return;

        const createChannel = await Database.GetRow("guild", {
            "id": state.guild.id, "privateVoiceCreateChannelId": state.channelId
        }) != null;

        if (createChannel)
            await CreateVoiceChannel(state.member);
    }
);
