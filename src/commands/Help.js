const { CreateCommand, Utils } = require("../Command.js");

/**
 * @param {{ title: String, hidden: Boolean|undefined, hiddenNames: String[]|undefined }} commandDoc
 * @param {String} [titleOverride]
 * @returns {String}
 */
const _GetCommandDocName = (commandDoc, titleOverride, forceName = true) => {
    const isHidden = commandDoc.hidden;
    if (!isHidden) return titleOverride ?? commandDoc.title;

    if (Array.isArray(commandDoc.hiddenNames)) {
        if (commandDoc.hiddenNames.length > 0) {
            return "" + Utils.GetRandomArrayElement(commandDoc.hiddenNames);
        } else if (!forceName) {
            return null;
        }
    }

    return "" + Math.round( Math.random() * 100 );
};

/**
 * @param {Any[]|Any} description 
 * @returns {Any}
 */
const _HandleDescription = (description, nullFallback) =>
    Array.isArray(description) ?
        Utils.JoinArray(description, "\n") :
        (description ?? nullFallback);

module.exports = CreateCommand({
    "name": "help",
    "shortcut": "h",
    "arguments": [{
        "name": "[PATH]",
        "types": [ "string" ],
        "isVariadic": true
    }],
    "execute": async (msg, guild, locale, [ docsPath ]) => {
        const localePath = [ "docs" ];
        for (let i = 0; i < docsPath.length; i++)
            localePath.push("subcommands", docsPath[i]);

        const commandDoc = locale.GetSubLocale(localePath) ?? locale.GetSubLocale("emptyDoc");
        const commandTitle = commandDoc.Get("title", false);

        const noTitle = locale.Get("noTitle");
        const embed = Utils.GetDefaultEmbedForMessage(msg, true)
            .setTitle(commandTitle === null ? docsPath[docsPath.length - 1] : (commandTitle ?? noTitle))
            .setDescription(
                _HandleDescription(commandDoc.Get("longDescription", false), null) ??
                _HandleDescription(commandDoc.Get("description", false), "")
            );

        const subcommands = commandDoc.GetSubLocale("subcommands");
        if (subcommands != null) {
            for (const subKey of Object.keys(subcommands._locale)) {
                const subDoc = subcommands.Get(subKey, false);
                if (subDoc.hidden) {
                    const name = _GetCommandDocName(subDoc, noTitle, false);
                    if (name != null) embed.addField(name, locale.Get("noSubcommands"), false);
                    continue;
                }

                let subSubCmdList;
                if (subDoc.subcommands == null) {
                    subSubCmdList = locale.Get("noSubcommands");
                } else {
                    const subSubcommands = subcommands.GetSubLocale([ subKey, "subcommands" ]);
                    subSubCmdList = locale.GetFormatted(
                        "subcommandsList", {
                            "commands": locale.GetFormattedInlineList(
                                Object.keys(subSubcommands._locale),
                                null,
                                el => ({ "value": _GetCommandDocName(subSubcommands.Get(el, false), el) })
                            )
                        }
                    );
                }

                embed.addField(subDoc.title === null ? subKey : (subDoc.title ?? noTitle), `${
                    _HandleDescription(subDoc.description, "")
                }\n${subSubCmdList}`, false);
            }
        }

        await msg.channel.send({ "embeds": [ embed ] });
    }
});
