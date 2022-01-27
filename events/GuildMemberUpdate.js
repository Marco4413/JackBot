const { MessageEmbed, GuildMember, BaseGuildTextChannel } = require("discord.js");
const { CreateEventListener } = require("../EventListener.js");
const Database = require("../Database.js");
const Utils = require("../Utils.js");
const { GetCommandLocale } = require("../Localization.js");

/**
 * EXPORTED FOR TEST USE ONLY
 * @param {GuildMember} member
 * @param {BaseGuildTextChannel?} [textChannel]
 * @returns {Boolean}
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

module.exports = CreateEventListener(
    "guildMemberUpdate", async (oldMember, newMember) => {
        if (oldMember.premiumSinceTimestamp === newMember.premiumSinceTimestamp) return;
        await SendNitroBoostEmbed(newMember);
    }
);

module.exports.SendNitroBoostEmbed = SendNitroBoostEmbed;
