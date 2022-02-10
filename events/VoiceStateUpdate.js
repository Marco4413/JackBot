const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");
const { Permissions } = require("discord.js");

module.exports = CreateEventListener(
    "voiceStateUpdate", async (_, state) => {
        if (state.member.user.bot || state.channelId === null) return;

        const createChannel = await Database.GetRow("guild", {
            "id": state.guild.id, "privateVoiceCreateChannelId": state.channelId
        }) !== undefined;

        if (!createChannel) return;

        const user = await Database.GetOrCreateRow("user", {
            "guildId": state.guild.id,
            "userId": state.member.id
        });

        if (user.privateVoiceChannelId !== null) {
            const channel = state.guild.channels.resolve(user.privateVoiceChannelId);
            if (channel !== null) {
                if (!channel.deletable)
                    return;
                
                // Getting All Voice Channels of the Guild except the one that is being deleted
                const channels = (await state.member.guild.channels.fetch())
                    .filter(ch => ch.isVoice() && ch.id !== channel.id);

                // For each channel member
                for (const member of channel.members.values()) {
                    // If it's still connected
                    if (member.voice.channelId !== null) {
                        // Get a random channel that it can join
                        const channel = channels.filter(
                            ch => ch.permissionsFor(member).has(Permissions.FLAGS.CONNECT)
                        ).random();
                        // Set its channel to the one picked or disconnect if none
                        await member.voice.setChannel(channel ?? null, "GUILD_VOICE Channel Deleted.");
                    }
                }

                await channel.delete(`${state.member.id} asked for a new GUILD_VOICE Channel.`);
            }
        }
        
        const guild = await Database.GetOrCreateRow("guild", {
            "id": state.guild.id
        });
        
        /** @type {Permissions} */
        let everyonePermissions = state.guild.roles.everyone.permissions;
        if (guild.privateChannelEveryoneTemplateRoleId !== null) {
            const everyoneTemplateRole = state.guild.roles.resolve(
                guild.privateChannelEveryoneTemplateRoleId
            );
            
            if (everyoneTemplateRole !== null)
                everyonePermissions = everyoneTemplateRole.permissions;
        }

        /** @type {Permissions} */
        let ownerPermissions = state.guild.roles.everyone.permissions;
        if (guild.privateChannelOwnerTemplateRoleId !== null) {
            const ownerTemplateRole = state.guild.roles.resolve(
                guild.privateChannelOwnerTemplateRoleId
            );
            
            if (ownerTemplateRole !== null)
                ownerPermissions = ownerTemplateRole.permissions;
        }

        const channelName = `${state.member.displayName}'s Voice Channel`;
        const parent = state.guild.channels.resolve(guild.privateChannelCategoryId);
        const channel = await state.guild.channels.create(channelName, {
            "type": "GUILD_VOICE",
            "parent": parent?.type === "GUILD_CATEGORY" ? parent : null,
            "permissionOverwrites": [
                {
                    "id": state.guild.roles.everyone.id,
                    "type": "role",
                    "allow": everyonePermissions
                },
                {
                    "id": state.member.id,
                    "type": "member",
                    "allow": ownerPermissions
                }
            ]
        });

        await Database.SetRowAttr("user", {
            "guildId": state.guild.id,
            "userId": state.member.id
        }, { "privateVoiceChannelId": channel.id });

        await state.setChannel(channel, `${state.member.id} created a new private GUILD_VOICE Channel.`);
    }
);
