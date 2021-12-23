const { CreateCommand, Utils } = require("../Command.js");

module.exports = CreateCommand({
    "name": "ping",
    "subcommands": [
        {
            "name": "message",
            "shortcut": "msg",
            "execute": async (msg, guild, locale) => {
                const startEpoch = Date.now();
                const pingMessage = await msg.channel.send(locale.command.calculating);
                const ping = Date.now() - startEpoch;
                await pingMessage.delete();
                await msg.reply(Utils.FormatString(locale.command.result, ping));
            }
        }
    ],
    "execute": async (msg, guild, locale) => {
        await msg.reply(locale.command.pong);
    }
});
