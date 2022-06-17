const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "shortcuts",
    "shortcut": "short",
    "subcommands": [
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.MANAGE_GUILD,
            "arguments": [
                {
                    "name": "[ENABLE]",
                    "types": [ "boolean" ]
                }
            ],
            "execute": async (msg, guild, locale, [ enable ]) => {
                await Database.SetRowAttr("guild", { "id": msg.guildId }, { "shortcuts": enable });
                await msg.reply(locale._GetFormatted("changed", enable));
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        await msg.reply(locale._GetFormatted("current", guild.shortcuts));
    }
});
