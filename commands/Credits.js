const { Message, Channel } = require("discord.js");
const { CreateCommand, Database, Utils, DatabaseDefinitions, Permissions } = require("../Command.js");
const { Locale } = require("../Localization.js");
const SMath = require("../SandMath.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");

/**
 * @param {Locale} locale
 * @param {String} userId
 * @param {String} authorId
 * @param {Number} oldCredits
 * @param {Number} newCredits
 * @param {String} reason
 * @returns {String}
 */
const _GetFormattedCredits = (locale, userId, authorId, oldCredits, newCredits, reason) => {
    const creditsDelta = newCredits - oldCredits;
    const isCreditGain = creditsDelta >= 0;
    return locale.GetFormatted(
        isCreditGain ? "creditsGain" : "creditsLoss", {
            [isCreditGain ? "gain" : "loss"]: locale.TranslateNumber(creditsDelta, true, true),
            "delta": locale.TranslateNumber(Math.abs(creditsDelta), true, false),
            "user-mention": Utils.MentionUser(userId),
            "author-mention": Utils.MentionUser(authorId),
            "total": locale.TranslateNumber(newCredits, true, true),
            "reason": reason,
            "upvote": locale.GetCommon("upvote"),
            "downvote": locale.GetCommon("downvote")
        }
    );
};

/**
 * @param {Message} msg
 * @param {import("../DatabaseDefinitions").GuildRow} guildRow
 * @returns {Promise<Channel?>}
 */
const _GetCreditsChannel = async (msg, guildRow) => {
    const channelId = guildRow.creditsChannelId;
    const channel = await Utils.SafeFetch(msg.guild.channels, channelId);
    if (channel == null || !channel.isText())
        return null;
    return channel;
};

/**
 * 
 * @param {Message} msg 
 * @param {Locale} locale 
 * @param {"DESC"|"ASC"} sortingOrder 
 */
const _ReplyWithLeaderboard = async (msg, locale, boardSize = 4.5, sortingOrder = "DESC") => {
    const intBoardSize = Math.ceil(boardSize);
    const decBoardSize = 1 - (intBoardSize - boardSize);

    const leadUsers = await Database.GetRows("user", { "guildId": msg.guildId }, [ [ "credits", sortingOrder ] ], intBoardSize);
    if (leadUsers.length === 0) {
        await msg.reply(locale.Get("noUsers"));
        return;
    }

    const actualBoardSize = leadUsers.length - (1 - decBoardSize);

    const embed = Utils.GetDefaultEmbedForMessage(msg, false);
    embed.setTitle(locale.GetFormatted("title", {
        "count": actualBoardSize
    }));

    for (let i = 1; i <= leadUsers.length; i++) {
        const { userId, credits } = leadUsers[i - 1];
        const user = msg.guild.members.resolve(userId);

        const isLastEntry = i === leadUsers.length;
        const userSoftMention = locale.GetSoftMention("User", user?.displayName, userId);
        if (isLastEntry) {
            embed.addField(
                locale.GetFormatted("fieldTitle", {
                    "i": actualBoardSize,
                    "user": userSoftMention.substring(0, Math.floor(userSoftMention.length * decBoardSize))
                }),
                locale.GetFormatted("fieldValue", {
                    "total": locale.TranslateNumber(credits * decBoardSize, true, true)
                })
            );
        } else {
            embed.addField(
                locale.GetFormatted("fieldTitle", {
                    i, "user": userSoftMention
                }),
                locale.GetFormatted("fieldValue", {
                    "total": locale.TranslateNumber(credits, true, true)
                })
            );
        }
    }

    await msg.reply({ "embeds": [ embed ] });
};

module.exports = CreateCommand({
    "name": "credits",
    "shortcut": "cr",
    "canExecute": async (msg, guild, locale) =>
        !await ReplyIfBlacklisted(locale, "credits", msg, "inCreditsAccessList", "isCreditsAccessBlacklist"),
    "subcommands": [{
        "name": "channel",
        "permissions": Permissions.FLAGS.ADMINISTRATOR,
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
                    }, { "creditsChannelId": null });
                    await msg.reply(locale.Get("channelRemoved"));
                    return;
                }

                const channel = await Utils.SafeFetch(msg.guild.channels, channelId);
                if (channel == null || !channel.isText()) {
                    await msg.reply(locale.Get("invalidChannel"));
                    return;
                }

                await Database.SetRowAttr("guild", {
                    "id": msg.guildId
                }, { "creditsChannelId": channelId });
                await msg.reply(locale.GetFormatted(
                    "channelSet", {
                        "channel": locale.GetSoftMention(
                            "Channel",
                            channel?.name,
                            channelId
                        )
                    }
                ));
            }
        }],
        "execute": async (msg, guild, locale) => {
            if (guild.creditsChannelId == null) {
                await msg.reply(locale.Get("noChannel"));
                return;
            }

            const channel = await Utils.SafeFetch(msg.guild.channels, guild.creditsChannelId);
            await msg.reply(locale.GetFormatted(
                "currentChannel", {
                    "channel": locale.GetSoftMention(
                        "Channel",
                        channel?.name,
                        guild.creditsChannelId
                    )
                }
            ));
        }
    }, {
        "name": "top",
        "arguments": [{
            "name": "[BOARD SIZE 0:10]",
            "types": [ "number" ],
            "default": 4.5
        }],
        "execute": async (msg, guild, locale, [ boardSize ]) => {
            await _ReplyWithLeaderboard(
                msg, locale,
                Math.min(Math.max(boardSize, 0), 10), "DESC"
            );
        }
    }, {
        "name": "worst",
        "arguments": [{
            "name": "[BOARD SIZE 0:10]",
            "types": [ "number" ],
            "default": 4.5
        }],
        "execute": async (msg, guild, locale, [ boardSize ]) => {
            await _ReplyWithLeaderboard(
                msg, locale,
                Math.min(Math.max(boardSize, 0), 10), "ASC"
            );
        }
    }, {
        "name": "apply",
        "canExecute": async (msg, guild, locale) =>
            !await ReplyIfBlacklisted(locale, "credits apply", msg, "inCreditsManagerAccessList", "isCreditsManagerAccessBlacklist"),
        "arguments": [{
            "name": "[USER ID/MENTION]",
            "types": [ "user" ]
        }, {
            "name": "[FORMULA & REASON]",
            "types": [ "text" ]
        }],
        "execute": async (msg, guild, locale, [ userId, formulaAndReason ]) => {
            const user = await Utils.SafeFetch(msg.guild.members, userId);
            if (user == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            const [ formula, reason ] = formulaAndReason.split(";;");
            const trimmedReason = reason?.trimStart();

            if (trimmedReason == null || trimmedReason.length === 0) {
                await msg.reply(locale.Get("noReasonSpecified"));
                return;
            }

            const oldUserRow = await Database.GetOrCreateRow("user", {
                "guildId": msg.guildId, "userId": userId
            });

            let newCredits;
            try {
                newCredits = SMath.EvaluateToNumber(formula, {
                    "credits": oldUserRow.credits,
                    "c": oldUserRow.credits,
                    "x": oldUserRow.credits
                });
            } catch (err) {
                await msg.reply(locale.Get("formulaError"));
                return;
            }

            const newUserRow = await Database.SetRowAttr("user", {
                "guildId": msg.guildId, "userId": userId
            }, { "credits": Math.floor(newCredits) });

            const creditsChannel = await _GetCreditsChannel(msg, guild);
            await (creditsChannel ?? msg.channel).send(_GetFormattedCredits(
                locale, userId, msg.author.id, oldUserRow.credits, newUserRow.credits, trimmedReason
            ));

            if (creditsChannel == null)
                await msg.delete();
            else await msg.reply(locale.Get("creditsUpdated"));
        }
    }, {
        "name": "award",
        "shortcut": "a",
        "canExecute": async (msg, guild, locale) =>
            !await ReplyIfBlacklisted(locale, "credits award", msg, "inCreditsManagerAccessList", "isCreditsManagerAccessBlacklist"),
        "arguments": [{
            "name": "[USER ID/MENTION]",
            "types": [ "user" ]
        }, {
            "name": "[AWARDED CREDITS]",
            "types": [ "number" ]
        }, {
            "name": "[REASON]",
            "types": [ "text" ]
        }],
        "execute": async (msg, guild, locale, [ userId, creditsToAward, reason ]) => {
            const user = await Utils.SafeFetch(msg.guild.members, userId);
            if (user == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            if (reason.length === 0) {
                await msg.reply(locale.Get("noReasonSpecified"));
                return;
            }

            const oldUserRow = await Database.GetOrCreateRow("user", {
                "guildId": msg.guildId, "userId": userId
            });

            const newUserRow = await Database.SetRowAttr("user", {
                "guildId": msg.guildId, "userId": userId
            }, { "credits": Math.floor(oldUserRow.credits + creditsToAward) });


            const creditsChannel = await _GetCreditsChannel(msg, guild);
            await (creditsChannel ?? msg.channel).send(_GetFormattedCredits(
                locale, userId, msg.author.id, oldUserRow.credits, newUserRow.credits, reason
            ));

            if (creditsChannel == null)
                await msg.delete();
            else await msg.reply(locale.Get("creditsUpdated"));
        }
    }, {
        "name": "set",
        "shortcut": "s",
        "canExecute": async (msg, guild, locale) =>
            !await ReplyIfBlacklisted(locale, "credits set", msg, "inCreditsManagerAccessList", "isCreditsManagerAccessBlacklist"),
        "arguments": [{
            "name": "[USER ID/MENTION]",
            "types": [ "user" ]
        }, {
            "name": "[CREDITS]",
            "types": [ "number" ]
        }, {
            "name": "[REASON]",
            "types": [ "text" ]
        }],
        "execute": async (msg, guild, locale, [ userId, creditsToSet, reason ]) => {
            const user = await Utils.SafeFetch(msg.guild.members, userId);
            if (user == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            if (reason.length === 0) {
                await msg.reply(locale.Get("noReasonSpecified"));
                return;
            }
            
            const oldUserRow = await Database.GetOrCreateRow("user", {
                "guildId": msg.guildId, "userId": userId
            });

            const newUserRow = await Database.SetRowAttr("user", {
                "guildId": msg.guildId, "userId": userId
            }, { "credits": creditsToSet });

            const creditsChannel = await _GetCreditsChannel(msg, guild);
            await (creditsChannel ?? msg.channel).send(_GetFormattedCredits(
                locale, userId, msg.author.id, oldUserRow.credits, newUserRow.credits, reason
            ));

            if (creditsChannel == null)
                await msg.delete();
            else await msg.reply(locale.Get("creditsUpdated"));
        }
    }, {
        "name": "reset",
        "canExecute": async (msg, guild, locale) =>
            !await ReplyIfBlacklisted(locale, "credits reset", msg, "inCreditsManagerAccessList", "isCreditsManagerAccessBlacklist"),
        "arguments": [{
            "name": "[USER ID/MENTION]",
            "types": [ "user" ]
        }, {
            "name": "[REASON]",
            "types": [ "text" ]
        }],
        "execute": async (msg, guild, locale, [ userId, reason ]) => {
            const user = await Utils.SafeFetch(msg.guild.members, userId);
            if (user == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            if (reason.length === 0) {
                await msg.reply(locale.Get("noReasonSpecified"));
                return;
            }
            
            const oldUserRow = await Database.GetOrCreateRow("user", {
                "guildId": msg.guildId, "userId": userId
            });

            const newUserRow = await Database.SetRowAttr("user", {
                "guildId": msg.guildId, "userId": userId
            }, { "credits": DatabaseDefinitions.UserModel.credits.defaultValue });

            const creditsChannel = await _GetCreditsChannel(msg, guild);
            await (creditsChannel ?? msg.channel).send(_GetFormattedCredits(
                locale, userId, msg.author.id, oldUserRow.credits, newUserRow.credits, reason
            ));

            if (creditsChannel == null)
                await msg.delete();
            else await msg.reply(locale.Get("creditsUpdated"));
        }
    }],
    "arguments": [{
        "name": "[USER ID/MENTION]",
        "types": [ "user" ],
        "default": null
    }],
    "execute": async (msg, guild, locale, [ userId ]) => {
        if (userId != null) {
            if (await ReplyIfBlacklisted(
                locale, "credits [USER ID/MENTION]", msg,
                "inCreditsManagerAccessList", "isCreditsManagerAccessBlacklist"
            )) return;

            const targetUser = await Utils.SafeFetch(msg.guild.members, userId);
            if (targetUser == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            const userCredits = (await Database.GetRow("user", {
                "guildId": msg.guildId, userId
            }))?.credits ?? DatabaseDefinitions.UserModel.credits.defaultValue;

            await msg.reply(locale.GetFormatted(
                "otherCredits", {
                    "user": locale.GetSoftMention("User", targetUser?.displayName, userId),
                    "user-mention": Utils.MentionUser(userId),
                    "credits": locale.TranslateNumber(userCredits, true, true)
                }
            ));
            return;
        }

        const userCredits = (await Database.GetRow("user", {
            "guildId": msg.guildId, "userId": msg.member.id
        }))?.credits ?? DatabaseDefinitions.UserModel.credits.defaultValue;

        await msg.reply(locale.GetFormatted(
            "selfCredits", {
                "credits": locale.TranslateNumber(userCredits, true, true)
            }
        ));
    }
});
