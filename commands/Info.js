const { CreateCommand, Utils } = require("../Command.js");

const package = require("../package.json");

module.exports = CreateCommand({
    "name": "info",
    "shortcut": "i",
    "execute": async (msg, guild, locale) => {
        const embed = Utils.GetDefaultEmbedForMessage(msg, true);

        embed.setTitle(
            locale.Get("title")
        ).setDescription(
            locale.Get("description")
        ).addField(
            locale.Get("package.name"),
            package.name, true
        ).addField(
            locale.Get("package.version"),
            package.version, true
        ).addField(
            locale.Get("package.description"),
            package.description
        ).addField(
            locale.Get("package.author"),
            locale.GetFormatted("package.authorValue", {
                "name": package.author.name,
                "url": package.author.url
            }), true
        ).addField(
            locale.Get("package.license"),
            package.license, true
        ).addField(
            locale.Get("package.homepage"),
            package.homepage
        ).addField(
            locale.Get("package.contributors"),
            locale.GetFormattedList(
                package.contributors, "package.contributorsValue",
                el => ({
                    "name": el.name,
                    "url": el.url,
                    "contribution": el.contribution
                })
            )
        ).addField(
            locale.Get("package.dependencies"),
            locale.GetFormattedList(
                Object.keys(package.dependencies), "package.dependenciesValue",
                depName => ({
                    "name": depName,
                    "version": package.dependencies[depName]
                })
            )
        );

        msg.channel.send({
            "embeds": [ embed ]
        });
    }
});
