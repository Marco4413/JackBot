const { CreateCommand, Permissions, Database } = require("../Command.js");

module.exports = CreateCommand({
    "name": "shortcuts",
    "shortcut": "short",
    "permissions": Permissions.FLAGS.ADMINISTRATOR,
    "arguments": [
        {
            "types": [ "boolean" ],
            "default": null
        }
    ],
    "execute": async (msg, guild, [ enable ]) => {
        const enableShortcuts = enable === null ? !guild.shortcuts : enable;
        await Database.SetGuildAttr(msg.guild.id, { "shortcuts": enableShortcuts });
        msg.reply(`Shortcuts set to: \`${enableShortcuts}\``);
    }
});
