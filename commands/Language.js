const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");
const { HasLocale, GetAvailableLocales } = require("../Localization.js");

module.exports = CreateCommand({
    "name": "language",
    "shortcut": "lang",
    "subcommands": [
        {
            "name": "list",
            "shortcut": "l",
            "execute": (msg, guild, locale) => {
                const localesList = GetAvailableLocales().map(
                    localeName => Utils.FormatString(locale.common.listEntry, localeName)
                ).join("\n");
                msg.reply(Utils.FormatString(locale.command.available, localesList));
            }
        },
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.ADMINISTRATOR,
            "arguments": [
                {
                    "name": "[Name]",
                    "types": [ "string" ]
                }
            ],
            "execute": async (msg, guild, locale, [ localeName ]) => {
                if (!HasLocale(localeName)) {
                    msg.reply(locale.command.invalid);
                    return;
                }

                const { locale: newLocale } = await Database.SetGuildAttr(msg.guild.id, { "locale": localeName });
                msg.reply(Utils.FormatString(locale.command.changed, newLocale));
            }
        }
    ],
    "execute": (msg, guild, locale) => {
        msg.reply(Utils.FormatString(locale.command.current, guild.locale));
    }
});
