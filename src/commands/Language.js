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
                await msg.reply(locale.GetFormattedList(
                    GetAvailableLocales(), null, undefined, "available"
                ));
            }
        },
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.Flags.ManageGuild,
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
                await msg.reply(locale.GetFormatted("changed", { "lang-name": newLocale }));
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        await msg.reply(locale.GetFormatted("current", { "lang-name": guild.locale }));
    }
});
