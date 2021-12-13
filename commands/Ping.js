const { CreateCommand } = require("../Command.js");

module.exports = CreateCommand({
    "name": "ping",
    "subcommands": [
        {
            "name": "message",
            "shortcut": "msg",
            "execute": async msg => {
                const startEpoch = Date.now();
                const pingMessage = await msg.channel.send("Calculating Ping...");
                const ping = Date.now() - startEpoch;
                await pingMessage.delete();
                msg.reply(`Ping is ${ping}ms`);
            }
        }
    ],
    "execute": msg => {
        msg.reply("Pong!");
    }
});
