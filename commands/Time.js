const { CreateCommand, Utils } = require("../Command.js");

const _TIME_FLAGS = [
    "d", "D", "t", "T",
    "f", "F", "R"
];

module.exports = CreateCommand({
    "name": "time",
    "arguments": [{
        "name": "[DATE]",
        "types": [ "date" ]
    }],
    "execute": async (msg, guild, locale, [ date ]) => {
        const time = Math.floor(date.getTime() / 1e3);
        await msg.reply(locale.GetFormattedList(
            _TIME_FLAGS, "timeFormat",
            flag => ({ time, flag }),
            "title"
        ));
    }
});
