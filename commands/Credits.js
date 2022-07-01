const { CreateCommand, Database, Utils, DatabaseDefinitions } = require("../Command.js");
const { Locale } = require("../Localization.js");
const SMath = require("../SandMath.js");
const { ReplyIfBlacklisted } = require("./utils/AccessListUtils.js");

/**
 * @param {Locale} locale
 * @param {String} userId
 * @param {Number} oldCredits
 * @param {Number} newCredits
 * @param {String} reason
 * @returns {String}
 */
const _GetFormattedCredits = (locale, userId, oldCredits, newCredits, reason) => {
    const creditsDelta = newCredits - oldCredits;
    const isCreditGain = creditsDelta >= 0;
    return locale.GetFormatted(
        isCreditGain ? "creditsGain" : "creditsLoss", {
            [isCreditGain ? "gain" : "loss"]: Utils.NumberToSignedString(creditsDelta),
            "user-mention": Utils.MentionUser(userId),
            "total": Utils.NumberToSignedString(newCredits),
            "reason": reason,
            "upvote": locale.GetCommon("upvote"),
            "downvote": locale.GetCommon("downvote")
        }
    );
};

module.exports = CreateCommand({
    "name": "credits",
    "shortcut": "cr",
    "canExecute": async (msg, guild, locale) =>
        !await ReplyIfBlacklisted(locale, "credits", msg, "inCreditsAccessList", "isCreditsAccessBlacklist"),
    "subcommands": [{
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
            const user = msg.guild.members.resolve(userId);
            if (user == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            const [ formula, reason ] = formulaAndReason.split(";;");
            const trimmedReason = reason.trimStart();

            if (trimmedReason.length === 0) {
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
                    "c": oldUserRow.credits
                });
            } catch (err) {
                await msg.reply(locale.Get("formulaError"));
                return;
            }

            const newUserRow = await Database.SetRowAttr("user", {
                "guildId": msg.guildId, "userId": userId
            }, { "credits": Math.floor(newCredits) });

            await msg.channel.send(_GetFormattedCredits(
                locale, userId, oldUserRow.credits, newUserRow.credits, trimmedReason
            ));
            await msg.delete();
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
            const user = msg.guild.members.resolve(userId);
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

            await msg.channel.send(_GetFormattedCredits(
                locale, userId, oldUserRow.credits, newUserRow.credits, reason
            ));
            await msg.delete();
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
            const user = msg.guild.members.resolve(userId);
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

            await msg.channel.send(_GetFormattedCredits(
                locale, userId, oldUserRow.credits, newUserRow.credits, reason
            ));
            await msg.delete();
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
            const user = msg.guild.members.resolve(userId);
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

            await msg.channel.send(_GetFormattedCredits(
                locale, userId, oldUserRow.credits, newUserRow.credits, reason
            ));
            await msg.delete();
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

            const targetUser = msg.guild.members.resolve(userId);
            if (targetUser == null) {
                await msg.reply(locale.Get("invalidUser"));
                return;
            }

            const userCredits = (await Database.GetRow("user", {
                "guildId": msg.guildId, userId
            }))?.credits ?? DatabaseDefinitions.UserModel.credits.defaultValue;

            await msg.channel.send(locale.GetFormatted(
                "otherCredits", {
                    "user": locale.GetSoftMention("User", targetUser?.displayName, userId),
                    "user-mention": Utils.MentionUser(userId),
                    "credits": Utils.NumberToSignedString(userCredits)
                }
            ));
            await msg.delete();
            return;
        }

        const userCredits = (await Database.GetRow("user", {
            "guildId": msg.guildId, "userId": msg.member.id
        }))?.credits ?? DatabaseDefinitions.UserModel.credits.defaultValue;

        await msg.reply(locale.GetFormatted(
            "selfCredits", {
                "credits": Utils.NumberToSignedString(userCredits)
            }
        ));
    }
});
