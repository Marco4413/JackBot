const { CreateCommand, Utils } = require("../Command.js");
const SMath = require("../SandMath.js");

module.exports = CreateCommand({
    "name": "calculate",
    "shortcut": "calc",
    "execute": async (msg, guild, locale, [ mathExpr ]) => {
        try {
            const result = SMath.evaluate(mathExpr);
            await msg.reply(locale.GetFormatted(
                "expressionResult", mathExpr, Utils.TranslateNumber(result, locale)
            ));
        } catch (err) {
            await msg.reply(locale.Get("expressionError"));
        }
    }
});
