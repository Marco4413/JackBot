const { CreateCommand, Utils } = require("../Command.js");
const SMath = require("../SandMath.js");

module.exports = CreateCommand({
    "name": "calculate",
    "shortcut": "calc",
    "execute": async (msg, guild, locale, args) => {
        const mathExpr = Utils.JoinArray(args, " ");
        try {
            const result = SMath.evaluate(mathExpr);
            await msg.reply(Utils.FormatString(
                locale.command.expressionResult,
                mathExpr, Utils.TranslateNumber(result, locale)
            ));
        } catch (err) {
            await msg.reply(locale.command.expressionError);
        }
    }
});
