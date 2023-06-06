const { Message, TextChannel, ChannelType } = require("discord.js");
const { CreateCommand, Permissions, Database, DatabaseDefinitions, Utils } = require("../Command.js");
const { Locale } = require("../Localization.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");

/**
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @param {Locale} locale
 * @param {Number} suggestionId
 * @param {String} reason
 * @param {Boolean} approve
 * @param {Boolean} implemented
 */
const _ProcessSuggestion = async (msg, guild, locale, suggestionId, reason, approve, implemented) => {
    if (guild.suggestionChannelId == null) {
        await msg.reply(locale.Get("noChannelSet"));
        return;
    }

    /** @type {TextChannel} */
    const suggestionChannel = await Utils.SafeFetch(msg.guild.channels, guild.suggestionChannelId);
    if (suggestionChannel == null) {
        await msg.reply(locale.GetFormatted("noChannelFound", {
            "id": guild.suggestionChannelId
        }));
        return;
    }

    if (guild.suggestionResultChannelId == null) {
        await msg.reply(locale.Get("noResultChannelSet"));
        return;
    }

    /** @type {TextChannel} */
    const resultChannel = await Utils.SafeFetch(msg.guild.channels, guild.suggestionResultChannelId);
    if (resultChannel == null) {
        await msg.reply(locale.GetFormatted("noResultChannelFound", {
            "id": guild.suggestionResultChannelId
        }));
        return;
    }

    const suggestionRow = await Database.GetRow("suggestion", { "id": suggestionId, "guildId": msg.guildId });
    if (suggestionRow == null) {
        await msg.reply(locale.Get("noSuggestionFound"));
        return;
    }

    const suggestionMessage = await Utils.SafeFetch(suggestionChannel.messages, suggestionRow.messageId);
    if (suggestionMessage == null) {
        await Database.RemoveRows("suggestion", { "id": suggestionId });
        await msg.reply(locale.Get("noSuggestionMessage"));
        return;
    }

    const suggestionEmbed = suggestionMessage.embeds[suggestionMessage.embeds.length - 1];
    const suggestionField = suggestionEmbed.fields[suggestionEmbed.fields.length - 1];
    const embed = Utils.GetDefaultEmbedForMessage(msg, true);
    
    if (implemented) {
        embed.setColor(Number.parseInt(locale.Get("suggestionImplementedColor")));
        embed.setTitle(locale.GetFormatted("suggestionImplementedTitle", { "id": suggestionId }));
        embed.setDescription(locale.GetFormatted(
            "suggestionImplementedDescription",
            { "user-mention": Utils.MentionUser(suggestionRow.authorId) }
        ));
    }

    if (approve) {
        embed.setColor(Number.parseInt(locale.Get("suggestionApprovedColor")));
        embed.setTitle(locale.GetFormatted("suggestionApprovedTitle", { "id": suggestionId }));
        embed.setDescription(locale.GetFormatted(
            "suggestionApprovedDescription",
            { "user-mention": Utils.MentionUser(suggestionRow.authorId) }
        ));
    } else {
        embed.setColor(Number.parseInt(locale.Get("suggestionRejectedColor")));
        embed.setTitle(locale.GetFormatted("suggestionRejectedTitle", { "id": suggestionId }));
        embed.setDescription(locale.GetFormatted(
            "suggestionRejectedDescription",
            { "user-mention": Utils.MentionUser(suggestionRow.authorId) }
        ));
    }

    embed.addFields([{
        "name": locale.Get("suggestionTextTitle"),
        "value": suggestionField.value
    }, {
        "name": locale.Get("suggestionReasonTitle"),
        "value": reason.length === 0 ? locale.Get("suggestionNoReason") : reason
    }]);

    embed.image = suggestionEmbed.image;

    await resultChannel.send({ "embeds": [ embed ] });
    await Database.RemoveRows("suggestion", { "id": suggestionId });
    await suggestionMessage.delete();
    await msg.delete();
};

module.exports = CreateCommand({
    "name": "suggestion",
    "shortcut": "suggest",
    "canExecute": async (msg, guild, locale) =>
        !await ReplyIfBlacklisted(locale, "suggestion", msg, "inSuggestionAccessList", "isSuggestionAccessBlacklist"),
    "subcommands": [
        {
            "name": "channel",
            "permissions": Permissions.Flags.Administrator,
            "subcommands": [
                {
                    "name": "set",
                    "shortcut": "s",
                    "arguments": [{
                        "name": "[CHANNEL MENTION/ID]",
                        "types": [ "channel" ],
                        "default": null
                    }],
                    "execute": async (msg, guild, locale, [ channelId ]) => {
                        if (channelId == null) {
                            await Database.SetRowAttr("guild", {
                                "id": msg.guildId
                            }, { "suggestionChannelId": null });
                            await msg.reply(locale.Get("channelRemoved"));
                            return;
                        }

                        const channel = await Utils.SafeFetch(msg.guild.channels, channelId);
                        if (channel == null || channel.type !== ChannelType.GuildText) {
                            await msg.reply(locale.Get("invalidChannel"));
                            return;
                        }
    
                        await Database.SetRowAttr("guild", {
                            "id": msg.guildId
                        }, { "suggestionChannelId": channelId });
                        await msg.reply(locale.Get("channelSet"));
                    }
                },
                {
                    "name": "result",
                    "shortcut": "res",
                    "subcommands": [{
                        "name": "set",
                        "shortcut": "s",
                        "arguments": [{
                            "name": "[CHANNEL MENTION/ID]",
                            "types": [ "channel" ],
                            "default": null
                        }],
                        "execute": async (msg, guild, locale, [ channelId ]) => {
                            if (channelId == null) {
                                await Database.SetRowAttr("guild", {
                                    "id": msg.guildId
                                }, { "suggestionResultChannelId": null });
                                await msg.reply(locale.Get("resultChannelRemoved"));
                                return;
                            }
    
                            const channel = await Utils.SafeFetch(msg.guild.channels, channelId);
                            if (channel == null || channel.type !== ChannelType.GuildText) {
                                await msg.reply(locale.Get("invalidChannel"));
                                return;
                            }
        
                            await Database.SetRowAttr("guild", {
                                "id": msg.guildId
                            }, { "suggestionResultChannelId": channelId });
                            await msg.reply(locale.Get("resultChannelSet"));
                        }
                    }],
                    "execute": async (msg, guild, locale) => {
                        if (guild.suggestionResultChannelId == null) {
                            await msg.reply(locale.Get("noResultChannel"));
                            return;
                        }
        
                        const resultChannel = await Utils.SafeFetch(msg.guild.channels, guild.suggestionResultChannelId);
                        await msg.reply(locale.GetFormatted(
                            "currentResultChannel", {
                                "channel": locale.GetSoftMention(
                                    "Channel",
                                    resultChannel?.name,
                                    guild.suggestionResultChannelId
                                )
                            }
                        ));
                    }
                }
            ],
            "execute": async (msg, guild, locale) => {
                if (guild.suggestionChannelId == null) {
                    await msg.reply(locale.Get("noChannel"));
                    return;
                }

                const channel = await Utils.SafeFetch(msg.guild.channels, guild.suggestionChannelId);
                await msg.reply(locale.GetFormatted(
                    "currentChannel", {
                        "channel": locale.GetSoftMention(
                            "Channel",
                            channel?.name,
                            guild.suggestionChannelId
                        )
                    }
                ));
            }
        },
        {
            "name": "approve",
            "canExecute": async (msg, guild, locale) =>
                !await ReplyIfBlacklisted(locale, "suggestion approve", msg, "inSuggestionManagerAccessList", "isSuggestionManagerAccessBlacklist"),
            "arguments": [{
                "name": "[SUGGESTION ID]",
                "types": [ "number" ]
            }, {
                "name": "[APPROVAL REASON]",
                "types": [ "text" ]
            }],
            "execute": async (msg, guild, locale, [ suggestionId, reason ]) =>
                await _ProcessSuggestion(msg, guild, locale, suggestionId, reason, true, false)
        },
        {
            "name": "reject",
            "canExecute": async (msg, guild, locale) =>
                !await ReplyIfBlacklisted(locale, "suggestion reject", msg, "inSuggestionManagerAccessList", "isSuggestionManagerAccessBlacklist"),
            "arguments": [{
                "name": "[SUGGESTION ID]",
                "types": [ "number" ]
            }, {
                "name": "[REJECTION REASON]",
                "types": [ "text" ]
            }],
            "execute": async (msg, guild, locale, [ suggestionId, reason ]) =>
                await _ProcessSuggestion(msg, guild, locale, suggestionId, reason, false, false)
        },
        {
            "name": "implemented",
            "canExecute": async (msg, guild, locale) =>
                !await ReplyIfBlacklisted(locale, "suggestion implemented", msg, "inSuggestionManagerAccessList", "isSuggestionManagerAccessBlacklist"),
            "arguments": [{
                "name": "[SUGGESTION ID]",
                "types": [ "number" ]
            }, {
                "name": "[REASON]",
                "types": [ "text" ]
            }],
            "execute": async (msg, guild, locale, [ suggestionId, reason ]) =>
                await _ProcessSuggestion(msg, guild, locale, suggestionId, reason, false, true)
        }
    ],
    "arguments": [{
        "name": "[SUGGESTION]",
        "types": [ "text" ]
    }],
    "execute": async (msg, guild, locale, [ suggestion ]) => {
        if (guild.suggestionChannelId == null) {
            await msg.reply(locale.Get("noChannelSet"));
            return;
        }
        
        /** @type {TextChannel} */
        const suggestionChannel = await Utils.SafeFetch(msg.guild.channels, guild.suggestionChannelId);
        if (suggestionChannel == null) {
            await msg.reply(locale.GetFormatted("noChannelFound",
                { "id": guild.suggestionChannelId }
            ));
            return;
        }

        if (suggestion.length === 0) {
            await msg.reply(locale.Get("noSuggestionSpecified"));
            return;
        } else if (!Utils.IsValidEmbedValue(suggestion)) {
            await msg.reply(locale.Get("suggestionTooLong"));
            return;
        }

        const suggestionRow = await Database.CreateRow("suggestion", {
            "guildId": msg.guildId,
            "authorId": msg.member.id
        }, true);

        const embed = Utils.GetDefaultEmbedForMessage(msg, true);
        embed.setTitle(locale.GetFormatted("suggestionSentTitle", { "id": suggestionRow.id }));
        embed.setDescription(locale.GetFormatted(
            "suggestionSentDescription",
            { "user-mention": Utils.MentionUser(msg.member.id) }
        ));
        embed.addFields([{
            "name": locale.Get("suggestionTextTitle"),
            "value": suggestion
        }]);

        embed.setImage(Utils.MatchImageUrl(suggestion));

        /** @type {Message} */
        const suggestionMessage = await suggestionChannel.send({ "embeds": [ embed ] });
        await Database.SetRowAttr("suggestion", { "id": suggestionRow.id }, {
            "messageId": suggestionMessage.id
        });

        await Utils.SafeReact(suggestionMessage, locale.GetCommon("upvote"));
        await Utils.SafeReact(suggestionMessage, locale.GetCommon("downvote"));
        await msg.delete();
    }
});
