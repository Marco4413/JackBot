const { CreateCommand, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "ping",
    "subcommands": [
        {
            "name": "message",
            "shortcut": "msg",
            "execute": async (msg, guild, locale) => {
                const startEpoch = Date.now();
                const pingMessage = await msg.channel.send(locale.Get("calculating"));
                const ping = Date.now() - startEpoch;
                await pingMessage.delete();
                await msg.reply(locale.GetFormatted("result", ping));
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        await msg.reply(locale.Get("pong"));
    }
});
