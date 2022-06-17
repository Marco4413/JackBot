const { CreateCommand, Permissions, Database, DatabaseDefinitions, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "prefix",
    "shortcut": "pre",
    "subcommands": [
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.MANAGE_GUILD,
            "arguments": [
                {
                    "name": "[PREFIX]",
                    "types": [ "string" ]
                }
            ],
            "execute": async (msg, guild, locale, [ prefix ]) => {
                /** @type {String} */
                const constrainedPrefix = prefix.substring(0, DatabaseDefinitions.MAX_PREFIX_LENGTH);
                const { prefix: newPrefix } = await Database.SetRowAttr("guild", { "id": msg.guildId }, { "prefix": constrainedPrefix });
                await msg.reply(locale.GetFormatted("changed", { "prefix": newPrefix }));
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        await msg.reply(locale.GetFormatted("current", { "prefix": guild.prefix }));
    }
});
