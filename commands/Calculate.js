const { CreateCommand, Utils } = require("../Command.js");
const SMath = require("../SandMath.js");

module.exports = CreateCommand({
    "name": "calculate",
    "shortcut": "calc",
    "execute": async (msg, guild, locale, [ mathExpr ]) => {
        try {
            const now = Date.now();
            const result = SMath.EvaluateToNumber(
                mathExpr, {
                    "date_ms": now,
                    "date_s": now / 1e3
                }
            );

            await msg.reply(locale.GetFormatted(
                "expressionResult", {
                    "expression": mathExpr,
                    "result": locale.TranslateNumber(result)
                }
            ));
        } catch (err) {
            await msg.reply(locale.Get("expressionError"));
        }
    }
});
