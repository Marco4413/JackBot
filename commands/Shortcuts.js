const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "shortcuts",
    "shortcut": "short",
    "subcommands": [
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.ADMINISTRATOR,
            "arguments": [
                {
                    "name": "[Enable]",
                    "types": [ "boolean" ]
                }
            ],
            "execute": async (msg, guild, locale, [ enable ]) => {
                await Database.SetGuildAttr(msg.guild.id, { "shortcuts": enable });
                msg.reply(Utils.FormatString(locale.command.changed, enable));
            }
        }
    ],
    "execute": (msg, guild, locale) => {
        msg.reply(Utils.FormatString(locale.command.current, guild.shortcuts));
    }
});
