const { CreateCommand, Utils } = require("../Command.js");

/**
 * @param {{ title: String, hidden: Boolean|undefined, hiddenNames: String[]|undefined }} commandDoc
 * @param {String} [titleOverride]
 * @returns {String}
 */
const _GetCommandDocName = (commandDoc, titleOverride) => {
    const isHidden = commandDoc.hidden;
    if (!isHidden) return titleOverride === undefined ? commandDoc.title : titleOverride;

    const hasHiddenNames = Array.isArray(commandDoc.hiddenNames) && commandDoc.hiddenNames.length > 0;
    return hasHiddenNames ? Utils.GetRandomArrayElement(commandDoc.hiddenNames) : Math.round( Math.random() * 100 );
};

module.exports = CreateCommand({
    "name": "help",
    "shortcut": "h",
    "execute": async (msg, guild, locale, docsPath) => {
        let currentDoc = locale.Get("docs", false);
        for (let i = 0; i < docsPath.length; i++) {
            if (currentDoc.subcommands === undefined) {
                currentDoc = locale.Get("emptyDoc");
                break;
            }
            
            const subDoc = currentDoc.subcommands[docsPath[i]];
            if (subDoc === undefined) {
                currentDoc = locale.Get("emptyDoc");
                break;
            }

            currentDoc = subDoc;
        }

        const hasSubcommands = currentDoc.subcommands;
        const embed = Utils.GetDefaultEmbedForMessage(msg, true)
            .setTitle(currentDoc.title)
            .setDescription(currentDoc.description);

        if (hasSubcommands) {
            for (const subKey of Object.keys(currentDoc.subcommands)) {
                const subDoc = currentDoc.subcommands[subKey];
                if (subDoc.hidden) {
                    embed.addField(_GetCommandDocName(subDoc), locale.Get("noSubcommands"), false);
                    continue;
                }

                let subSubCmdList;
                if (subDoc.subcommands === undefined) {
                    subSubCmdList = locale.Get("noSubcommands");
                } else {
                    subSubCmdList = locale.GetFormatted(
                        "subcommandsList",
                        locale.GetCommonFormatted(
                            "listDelimiter",
                            Utils.JoinArray(
                                Object.keys(subDoc.subcommands),
                                locale.GetCommon("listSeparator"),
                                el => _GetCommandDocName(subDoc.subcommands[el], el)
                            )
                        )
                    );
                }

                embed.addField(subDoc.title, `${subDoc.description}\n${subSubCmdList}`, false);
            }
        }

        await msg.channel.send({ "embeds": [ embed ] });
    }
});
