const { MessageEmbed, GuildMember } = require("discord.js");
const { GetCommandLocale } = require("../../Localization");
const Database = require("../../Database.js");
const Utils = require("../../Utils.js");

/**
 * EXPORTED FOR TEST USE ONLY
 * @param {GuildMember} member
 * @param {BaseGuildTextChannel?} [textChannel]
 * @returns {Promise<Boolean>}
 */
const SendNitroBoostEmbed = async (member, textChannel = null) => {
    const guildRow = await Database.GetOrCreateRow("guild", { "id": member.guild.id });
    if (textChannel === null) {
        if (guildRow.nitroBoostChannelId === null) return false;
        textChannel = await member.guild.channels.fetch(guildRow.nitroBoostChannelId);
        if (textChannel === null || !textChannel.isText()) return false;
    }

    const locale = GetCommandLocale(guildRow.locale, [ "boost" ]);
    const premiumSinceTimestamp = member.premiumSinceTimestamp ?? Date.now();
    const embed = new MessageEmbed({
        "author": {
            "iconURL": locale.Get("authorIconURL"),
            "name": locale.Get("authorName")
        },
        "description": locale.GetFormatted(
            "description",
            Utils.MentionUser(member.id), member.guild.name, member.guild.premiumSubscriptionCount
        ),
        "image": {
            "url": locale.Get("imageURL")
        },
        "color": locale.Get("color"),
        "thumbnail": {
            "url": member.displayAvatarURL()
        },
        "timestamp": premiumSinceTimestamp,
        "footer": {
            "text": locale.Get("footerText")
        }
    });

    await textChannel.send({
        "embeds": [ embed ]
    });

    return true;
};

module.exports = { SendNitroBoostEmbed };
