const { EmbedBuilder, GuildMember, ChannelType } = require("discord.js");
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
    if (textChannel == null) {
        if (guildRow.nitroBoostChannelId == null) return false;
        textChannel = await member.guild.channels.fetch(guildRow.nitroBoostChannelId);
        if (textChannel == null || textChannel.type !== ChannelType.GuildText) return false;
    }

    const locale = GetCommandLocale(guildRow.locale, [ "boost" ]);
    const premiumSinceTimestamp = member.premiumSinceTimestamp ?? Date.now();
    const embed = new EmbedBuilder({
        "author": {
            "iconURL": locale.Get("authorIconURL"),
            "name": locale.Get("authorName")
        },
        "description": locale.GetFormatted(
            "description", {
                "user-mention": Utils.MentionUser(member.id),
                "guild-name": member.guild.name,
                "boost-count": member.guild.premiumSubscriptionCount
            }
        ),
        "image": {
            "url": locale.Get("imageURL")
        },
        "color": Number.parseInt(locale.Get("color")),
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
