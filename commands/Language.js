const { CreateCommand, Permissions, Database, Utils } = require("../Command.js");
const { HasLocale, GetAvailableLocales } = require("../Localization.js");

module.exports = CreateCommand({
    "name": "language",
    "shortcut": "lang",
    "subcommands": [
        {
            "name": "list",
            "shortcut": "l",
            "execute": async (msg, guild, locale) => {
                const localesList = GetAvailableLocales().map(
                    localeName => locale._GetCommonFormatted("listEntry", localeName)
                ).join("\n");
                await msg.reply(locale._GetFormatted("available", localesList));
            }
        },
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.MANAGE_GUILD,
            "arguments": [
                {
                    "name": "[NAME]",
                    "types": [ "string" ]
                }
            ],
            "execute": async (msg, guild, locale, [ localeName ]) => {
                if (!HasLocale(localeName)) {
                    await msg.reply(locale.Get("invalid"));
                    return;
                }

                const { locale: newLocale } = await Database.SetRowAttr("guild", { "id": msg.guildId }, { "locale": localeName });
                await msg.reply(locale._GetFormatted("changed", newLocale));
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        await msg.reply(locale._GetFormatted("current", guild.locale));
    }
});
