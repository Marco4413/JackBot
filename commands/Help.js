const { CreateCommand, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "help",
    "shortcut": "h",
    "execute": (msg, guild, locale, docsPath) => {
        let currentDoc = locale.command.docs;
        for (let i = 0; i < docsPath.length; i++) {
            if (currentDoc.subcommands === undefined) {
                currentDoc = locale.command.emptyDoc;
                break;
            }
            
            const subDoc = currentDoc.subcommands[docsPath[i]];
            if (subDoc === undefined) {
                currentDoc = locale.command.emptyDoc;
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
                if (subDoc.hidden) continue;

                let subSubCmdList;
                if (subDoc.subcommands === undefined) {
                    subSubCmdList = locale.command.noSubcommands;
                } else {
                    subSubCmdList = Utils.FormatString(
                        locale.command.subcommandsList,
                        Utils.FormatString(
                            locale.common.listDelimiter,
                            Utils.JoinArray(
                                Object.keys(subDoc.subcommands),
                                locale.common.listSeparator,
                                // TODO: Do we really want to keep these as an Easter Egg or do we want to completely hide them?
                                el => subDoc.subcommands[el].hidden ? Math.round( Math.random() * 100 ) : el
                            )
                        )
                    );
                }

                embed.addField(subDoc.title, `${subDoc.description}\n${subSubCmdList}`, false);
            }
        }

        msg.channel.send({ "embeds": [ embed ] });
    }
});
