const { CreateCommand, Utils, Permissions, Database } = require("../Command.js");

module.exports = CreateCommand({
    "name": "sticky",
    "permissions": Permissions.FLAGS.MANAGE_CHANNELS,
    "channelPermissions": true,
    "subcommands": [{
        "name": "remove",
        "execute": async (msg, guild, locale) => {
            const channelRow = await Database.GetRow("channel", {
                "guildId": msg.guildId, "channelId": msg.channelId
            });

            if (channelRow?.stickyMessageId != null) {
                const stickyMessage = await Utils.SafeFetch(msg.channel.messages, channelRow.stickyMessageId);
                if (stickyMessage != null) {
                    await Utils.SafeDelete(stickyMessage);
                    await Database.SetRowAttr("channel", {
                        "guildId": msg.guildId, "channelId": msg.channelId
                    }, { "stickyMessageId": null });
                }
            }

            await Utils.SafeDelete(msg);
        }
    }, {
        "name": "embed",
        "arguments": [{
            "name": "[STICKY TEXT]",
            "types": [ "text" ]
        }],
        "execute": async (msg, guild, locale, [ stickyText ]) => {
            /** @type {String[]} */
            const embedComponents = Utils.SplitString(stickyText, ";;", 2, text => {
                const trimmed = text.trim();
                return trimmed.length > 0 ? trimmed : null;
            });

            let title, description;
            switch (embedComponents.length) {
            case 0: {
                await Utils.TimedMessageReply(msg, locale.Get("noText"));
                return;
            }
            case 1:
                title = locale.Get("defaultTitle");
                description = embedComponents[0];
                break;
            default:
                title = embedComponents[0] ?? locale.Get("defaultTitle");
                description = embedComponents[1];
            }

            if (description == null) {
                await Utils.TimedMessageReply(msg, locale.Get("noDescription"));
                return;
            }

            const channelRow = await Database.GetRow("channel", {
                "guildId": msg.guildId, "channelId": msg.channelId
            });
    
            if (channelRow?.stickyMessageId != null) {
                const oldStickyMessage = await Utils.SafeFetch(msg.channel.messages, channelRow.stickyMessageId);
                if (oldStickyMessage != null) await Utils.SafeDelete(oldStickyMessage);
            }

            const stickyMessage = await msg.channel.send({
                "embeds": [
                    Utils.GetDefaultEmbedForMessage(msg, false)
                        .setAuthor(null)
                        .setTitle(title)
                        .setDescription(description)
                        .setImage(Utils.MatchImageUrl(description))
                        .setFooter({ "iconURL": null, "text": locale.GetSoftMention("User", msg.author.username, msg.author.id) })
                ]
            });

            await Database.SetOrCreateRow("channel", {
                "guildId": msg.guildId, "channelId": msg.channelId
            }, { "stickyMessageId": stickyMessage.id });
    
            await Utils.SafeDelete(msg);
        }
    }],
    "arguments": [{
        "name": "[STICKY TEXT]",
        "types": [ "text" ]
    }],
    "execute": async (msg, guild, locale, [ stickyText ]) => {
        if (stickyText.length === 0) {
            await Utils.TimedMessageReply(msg, locale.Get("noText"));
            return;
        }

        const channelRow = await Database.GetRow("channel", {
            "guildId": msg.guildId, "channelId": msg.channelId
        });

        if (channelRow?.stickyMessageId != null) {
            const oldStickyMessage = await Utils.SafeFetch(msg.channel.messages, channelRow.stickyMessageId);
            if (oldStickyMessage != null) await Utils.SafeDelete(oldStickyMessage);
        }

        const stickyMessage = await msg.channel.send(stickyText);
        await Database.SetOrCreateRow("channel", {
            "guildId": msg.guildId, "channelId": msg.channelId
        }, { "stickyMessageId": stickyMessage.id });

        await Utils.SafeDelete(msg);
    }
});
