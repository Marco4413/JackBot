const { CreateCommand, Utils } = require("../Command.js");

const _NBSP = String.fromCodePoint(12644);

/**
 * @param {{ title: String, hidden: Boolean|undefined, hiddenNames: String[]|undefined }} commandDoc
 * @param {String} [titleOverride]
 * @param {Boolean} [forceName]
 * @param {Boolean} [ignoreHidden]
 * @param {Record<String, Any>} [titleFormats]
 * @returns {String}
 */
const _GetCommandDocName = (commandDoc, titleOverride, forceName = true, ignoreHidden = false, titleFormats = { }) => {
    const isHidden = commandDoc.hidden;
    if (ignoreHidden || !isHidden) return titleOverride ?? Utils.MapFormatString(commandDoc.title, titleFormats);

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
        const noTitle = locale.Get("noTitle");
        const embed = Utils.GetDefaultEmbedForMessage(
            msg, true
        ).setTitle(
            commandDoc.Get("fullTitle", false) ??
            _GetCommandDocName(commandDoc._locale, null, undefined, true, { "this-key": docsPath[docsPath.length - 1] }) ??
            noTitle
        ).setDescription(
            _HandleDescription(commandDoc.Get("longDescription", false), null) ??
            _HandleDescription(commandDoc.Get("description", false), "")
        );
        
        {
            const thumbnailUrl = commandDoc.Get("thumbnailUrl", false);
            if (thumbnailUrl != null) embed.setThumbnail(thumbnailUrl);
            const authorName = commandDoc.Get("authorName", false);
            if (authorName != null) embed.author.name = authorName;
            const authorIconUrl = commandDoc.Get("authorIconUrl", false);
            if (authorIconUrl != null) embed.author.iconURL = authorIconUrl;
            const imageUrl = commandDoc.Get("imageUrl", false);
            if (imageUrl != null) embed.setImage(imageUrl);
        }
        
        const subcommands = commandDoc.GetSubLocale("subcommands");
        if (subcommands != null) {
            for (const subKey of Object.keys(subcommands._locale)) {
                const subDoc = subcommands.Get(subKey, false);
                if (subDoc.hidden) {
                    const name = _GetCommandDocName(subDoc, noTitle, false);
                    if (name != null) {
                        embed.addFields([{
                            name,
                            "value": subDoc.hideSubcommandsPreview === true ? _NBSP : locale.Get("noSubcommands"),
                            "inline": false
                        }]);
                    }
                    continue;
                }

                let subSubCmdList = null;
                if (subDoc.hideSubcommandsPreview !== true) {
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
                }

                const fieldDescription = `${
                    _HandleDescription(subDoc.description, "")
                }\n${subSubCmdList ?? ""}`.trim();
                
                embed.addFields([{
                    "name": _GetCommandDocName(subDoc, null, undefined, true, { "this-key": subKey }),
                    "value": fieldDescription.length > 0 ? fieldDescription : _NBSP,
                    "inline": false
                }]);
            }
        }

        await msg.channel.send({ "embeds": [ embed ] });
    }
});
