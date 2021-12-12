const { Permissions } = require("discord.js");
const { CreateCommand, CommandArgumentType } = require("../Command.js");
const { SetGuildAttr } = require("../Database");

module.exports = CreateCommand({
    "name": "shortcuts",
    "shortcut": "short",
    "permissions": Permissions.FLAGS.ADMINISTRATOR,
    "arguments": [
        {
            "types": CommandArgumentType.BOOLEAN,
            "default": null
        }
    ],
    "execute": async ([ enable ], msg, guild) => {
        const enableShortcuts = enable === null ? !guild.shortcuts : enable;
        SetGuildAttr(msg.guild.id, { "shortcuts": enableShortcuts });
        msg.reply(`Shortcuts set to: \`${enableShortcuts}\``);
    }
});
