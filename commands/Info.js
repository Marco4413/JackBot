const { CreateCommand, Utils } = require("../Command.js");

const package = require("../package.json");

module.exports = CreateCommand({
    "name": "info",
    "shortcut": "i",
    "execute": async (msg, guild, locale) => {
        const embed = Utils.GetDefaultEmbedForMessage(msg, true);

        embed.setTitle(
            locale.command.title
        ).setDescription(
            locale.command.description
        ).addField(
            locale.command.package.name,
            package.name, true
        ).addField(
            locale.command.package.version,
            package.version, true
        ).addField(
            locale.command.package.description,
            package.description
        ).addField(
            locale.command.package.author,
            Utils.FormatString(
                locale.command.package.authorValue,
                package.author.name, package.author.url
            ), true
        ).addField(
            locale.command.package.license,
            package.license, true
        ).addField(
            locale.command.package.homepage,
            package.homepage
        ).addField(
            locale.command.package.contributors,
            Utils.JoinArray(
                package.contributors, "\n",
                el => Utils.FormatString(locale.common.listEntry, Utils.FormatString(locale.command.package.contributorsValue, el.name, el.url, el.contribution))
            )
        ).addField(
            locale.command.package.dependencies,
            Utils.JoinArray(
                Object.keys(package.dependencies), "\n", depName =>
                    Utils.FormatString(
                        locale.common.listEntry,
                        Utils.FormatString(
                            locale.command.package.dependenciesValue,
                            depName, package.dependencies[depName]
                        )
                    )
            )
        );

        msg.channel.send({
            "embeds": [ embed ]
        });
    }
});
