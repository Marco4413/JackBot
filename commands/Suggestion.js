const { Message, TextChannel } = require("discord.js");
const { CreateCommand, Permissions, Database, DatabaseDefinitions, Utils } = require("../Command.js");
const { Locale } = require("../Localization.js");
const Logger = require("../Logger.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");

/**
 * @param {Message} msg
 * @param {DatabaseDefinitions.GuildRow} guild
 * @param {Locale} locale
 * @param {Number} suggestionId
 * @param {String[]} reasonWords
 * @param {Boolean} approve
 */
const _ProcessSuggestion = async (msg, guild, locale, suggestionId, reasonWords, approve) => {
    if (guild.suggestionChannelId == null) {
        await msg.reply(locale.Get("noChannelSet"));
        return;
    }

    /** @type {TextChannel} */
    const suggestionChannel = msg.guild.channels.resolve(guild.suggestionChannelId);
    if (suggestionChannel == null) {
        await msg.reply(locale.GetFormatted("noChannelFound", guild.suggestionChannelId));
        return;
    }

    if (guild.suggestionResultChannelId == null) {
        await msg.reply(locale.Get("noResultChannelSet"));
        return;
    }

    /** @type {TextChannel} */
    const resultChannel = msg.guild.channels.resolve(guild.suggestionResultChannelId);
    if (resultChannel == null) {
        await msg.reply(locale.GetFormatted("noResultChannelFound", guild.suggestionResultChannelId));
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
    const reason = Utils.JoinArray(reasonWords, " ").trim();

    const embed = Utils.GetDefaultEmbedForMessage(msg, true);
    
    if (approve) {
        embed.setColor(locale.Get("suggestionApprovedColor"));
        embed.setTitle(locale.GetFormatted("suggestionApprovedTitle", suggestionId));
        embed.setDescription(locale.GetFormatted(
            "suggestionApprovedDescription",
            Utils.MentionUser(suggestionRow.authorId)
        ));
    } else {
        embed.setColor(locale.Get("suggestionRejectedColor"));
        embed.setTitle(locale.GetFormatted("suggestionRejectedTitle", suggestionId));
        embed.setDescription(locale.GetFormatted(
            "suggestionRejectedDescription",
            Utils.MentionUser(suggestionRow.authorId)
        ));
    }

    embed.addField(locale.Get("suggestionTextTitle"), suggestionField.value);
    embed.addField(
        locale.Get("suggestionReasonTitle"),
        reason.length === 0 ? locale.Get("suggestionNoReason") : reason
    );

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
            "permissions": Permissions.FLAGS.MANAGE_GUILD,
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

                        const channel = msg.guild.channels.resolve(channelId);
                        if (channel == null || !channel.isText()) {
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
                    "permissions": Permissions.FLAGS.MANAGE_GUILD,
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
    
                            const channel = msg.guild.channels.resolve(channelId);
                            if (channel == null || !channel.isText()) {
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
        
                        const resultChannel = msg.guild.channels.resolve(guild.suggestionResultChannelId);
                        await msg.reply(locale.GetFormatted(
                            "currentResultChannel", locale.GetCommonFormatted(
                                "softMention",
                                resultChannel?.name ?? locale.GetCommon("unknownChannel"),
                                guild.suggestionResultChannelId
                            )
                        ));
                    }
                }
            ],
            "execute": async (msg, guild, locale) => {
                if (guild.suggestionChannelId == null) {
                    await msg.reply(locale.Get("noChannel"));
                    return;
                }

                const channel = msg.guild.channels.resolve(guild.suggestionChannelId);
                await msg.reply(locale.GetFormatted(
                    "currentChannel", locale.GetCommonFormatted(
                        "softMention",
                        channel?.name ?? locale.GetCommon("unknownChannel"),
                        guild.suggestionChannelId
                    )
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
                "types": [ "string" ],
                "isVariadic": true
            }],
            "execute": async (msg, guild, locale, [ suggestionId, words ]) =>
                await _ProcessSuggestion(msg, guild, locale, suggestionId, words, true)
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
                "types": [ "string" ],
                "isVariadic": true
            }],
            "execute": async (msg, guild, locale, [ suggestionId, words ]) =>
                await _ProcessSuggestion(msg, guild, locale, suggestionId, words, false)
        }
    ],
    "arguments": [{
        "name": "[SUGGESTION]",
        "types": [ "string" ],
        "isVariadic": true
    }],
    "execute": async (msg, guild, locale, [ words ]) => {
        if (guild.suggestionChannelId == null) {
            await msg.reply(locale.Get("noChannelSet"));
            return;
        }
        
        const suggestionChannel = msg.guild.channels.resolve(guild.suggestionChannelId);
        if (suggestionChannel == null) {
            await msg.reply(locale.GetFormatted("noChannelFound", guild.suggestionChannelId));
            return;
        }

        const suggestion = Utils.JoinArray(words, " ").trim();
        if (suggestion.length === 0) {
            await msg.reply(locale.Get("noSuggestionSpecified"));
            return;
        }

        const suggestionRow = await Database.CreateRow("suggestion", {
            "guildId": msg.guildId,
            "authorId": msg.member.id
        }, true);

        const embed = Utils.GetDefaultEmbedForMessage(msg, true);
        embed.setTitle(locale.GetFormatted("suggestionSentTitle", suggestionRow.id));
        embed.setDescription(locale.GetFormatted(
            "suggestionSentDescription",
            Utils.MentionUser(msg.member.id)
        ));
        embed.addField(locale.Get("suggestionTextTitle"), suggestion);

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
