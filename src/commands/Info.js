const { CreateCommand, Utils } = require("../Command.js");

const package = require("../../package.json");

module.exports = CreateCommand({
    "name": "info",
    "shortcut": "i",
    "execute": async (msg, guild, locale) => {
        const embed = Utils.GetDefaultEmbedForMessage(msg, true);

        embed.setTitle(
            locale.Get("title")
        ).setDescription(
            locale.Get("description")
        ).addFields([{
            "name": locale.Get("package.name"),
            "value": package.name,
            "inline": true
        }, {
            "name": locale.Get("package.version"),
            "value": package.version,
            "inline": true
        }, {
            "name": locale.Get("package.description"),
            "value": package.description
        }, {
            "name": locale.Get("package.author"),
            "value": locale.GetFormatted("package.authorValue", {
                "name": package.author.name,
                "url": package.author.url
            }),
            "inline": true
        }, {
            "name": locale.Get("package.license"),
            "value": package.license,
            "inline": true
        }, {
            "name": locale.Get("package.homepage"),
            "value": package.homepage
        }, {
            "name": locale.Get("package.contributors"),
            "value": locale.GetFormattedList(
                package.contributors, "package.contributorsValue",
                el => ({
                    "name": el.name,
                    "url": el.url,
                    "contribution": el.contribution
                })
            )
        }, {
            "name": locale.Get("package.dependencies"),
            "value": locale.GetFormattedList(
                Object.keys(package.dependencies), "package.dependenciesValue",
                depName => ({
                    "name": depName,
                    "version": package.dependencies[depName]
                })
            )
        }]);

        msg.channel.send({
            "embeds": [ embed ]
        });
    }
});
