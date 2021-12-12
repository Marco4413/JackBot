const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;

// This should be sage, IDs are 64bit Numbers and the biggest 64bit Number shouldn't
//  have more then 20 digits so we also have room to spare
const DISCORD_ID_MAX_LENGTH = 24;
const MAX_PREFIX_LENGTH = 4;

const GuildModel = {
    "guildID": {
        "primaryKey": true,
        "type": DataTypes.STRING(DISCORD_ID_MAX_LENGTH),
        "allowNull": false // This should be done automatically
    },
    "prefix": {
        "type": DataTypes.STRING(MAX_PREFIX_LENGTH),
        "allowNull": false,
        "defaultValue": "!"
    },
    "shortcuts": {
        "type": DataTypes.BOOLEAN,
        "allowNull": false,
        "defaultValue": true
    }
};

/**
 * @typedef {Object} GuildRow A Database Row for a specific Guild
 * @property {String} guildID The ID of the Guild
 * @property {String} prefix The prefix used by the Guild
 * @property {Boolean} shortcuts Whether or not shortcuts are enabled in the Guild
 */

module.exports = { DISCORD_ID_MAX_LENGTH, MAX_PREFIX_LENGTH, GuildModel };
