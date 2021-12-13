const { CreateCommand, Permissions, Database, DatabaseDefinitions, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "prefix",
    "shortcut": "pre",
    "subcommands": [
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.ADMINISTRATOR,
            "arguments": [
                {
                    "name": "[Prefix]",
                    "types": [ "string" ]
                }
            ],
            "execute": async (msg, guild, locale, [ prefix ]) => {
                /** @type {String} */
                const constrainedPrefix = prefix.substring(0, DatabaseDefinitions.MAX_PREFIX_LENGTH);
                const { prefix: newPrefix } = await Database.SetGuildAttr(msg.guild.id, { "prefix": constrainedPrefix });
                msg.reply(Utils.FormatString(locale.command.changed, newPrefix));
            }
        }
    ],
    "execute": (msg, guild, locale, args) => {
        msg.reply(Utils.FormatString(locale.command.current, guild.prefix));
    }
});
