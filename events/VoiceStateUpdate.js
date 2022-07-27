const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");
const { CreateVoiceChannel } = require("../commands/utils/ChannelUtils.js");
const Sequelize = require("sequelize");
const Utils = require("../Utils.js");

module.exports = CreateEventListener(
    "voiceStateUpdate", async (oldState, state) => {
        if (state.member.user.bot || state.channelId == null || oldState.channelId === state.channelId) return;

        const createChannel = await Database.GetRow("guild", {
            "id": state.guild.id, "privateVoiceCreateChannelId": state.channelId
        }) != null;

        if (createChannel)
            await CreateVoiceChannel(state.member);

        const notifyChannelRow = await Database.GetRow("channel", {
            "guildId": state.guild.id, "channelId": state.channelId,
            "joinNotificationChannelId": {
                [Sequelize.Op.ne]: null
            },
            "joinNotificationText": {
                [Sequelize.Op.ne]: null
            }
        });

        if (notifyChannelRow != null) {
            const notificationChannel = await Utils.SafeFetch(state.guild.channels, notifyChannelRow.joinNotificationChannelId);
            if (notificationChannel != null && notificationChannel.isText()) {
                await notificationChannel.send(Utils.MapFormatString(
                    notifyChannelRow.joinNotificationText, {
                        "join-user-mention": Utils.MentionUser(state.member.id),
                        "join-user-nickname": state.member.displayName,
                        "join-user-name": state.member.user.username,
                        "join-user-id": state.member.id,
                        "joined-channel-mention": Utils.MentionChannel(state.channelId),
                        "joined-channel-name": state.channel.name,
                        "joined-channel-id": state.channelId
                    }
                ));
            }
        }
    }
);
