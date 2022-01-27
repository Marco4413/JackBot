const { CreateCommand, Utils } = require("../Command.js");
const { TenorSearch } = require("../Tenor.js");

module.exports = CreateCommand({
    "name": "banana",
    "shortcut": "b",
    "execute": async (msg, guild, locale) => {
        const gif = Utils.GetRandomArrayElement(
            await TenorSearch("banana", 50, "search", "high", "minimal")
        );

        if (gif === undefined) {
            await msg.reply(locale.Get("noBanana"));
        } else {
            const embed = Utils.GetDefaultEmbedForMessage(msg, false)
                .setTitle(locale.Get("title"))
                .setImage(gif.media[0].gif.url);
            await msg.channel.send({ "embeds": [ embed ] });
        }
    }
});
