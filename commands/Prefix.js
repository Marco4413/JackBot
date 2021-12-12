const { CreateCommand, Permissions, Database, DatabaseDefinitions } = require("../Command.js");

module.exports = CreateCommand({
    "name": "prefix",
    "shortcut": "pre",
    "subcommands": [
        {
            "name": "set",
            "shortcut": "s",
            "permissions": Permissions.FLAGS.ADMINISTRATOR,
            "arguments": [
                {
                    "types": [ "string" ]
                }
            ],
            "execute": async (msg, guild, [ prefix ]) => {
                /** @type {String} */
                const constrainedPrefix = prefix.substring(0, DatabaseDefinitions.MAX_PREFIX_LENGTH);
                const { prefix: newPrefix } = await Database.SetGuildAttr(msg.guild.id, { "prefix": constrainedPrefix });
                msg.reply(`Prefix set to: \`${newPrefix}\``);
            }
        }
    ],
    "execute": async (msg, guild, args) => {
        msg.reply(`Current Prefix: \`${guild.prefix}\``);
    }
});
