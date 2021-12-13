const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;

// This should be sage, IDs are 64bit Numbers and the biggest 64bit Number shouldn't
//  have more then 20 digits so we also have room to spare
const MAX_DISCORD_ID_LENGTH = 24;
const MAX_PREFIX_LENGTH = 4;
const MAX_LOCALE_NAME_LENGTH = 8;

const GuildModel = {
    "guildID": {
        "primaryKey": true,
        "type": DataTypes.STRING(MAX_DISCORD_ID_LENGTH),
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
    },
    "locale": {
        "type": DataTypes.STRING(MAX_LOCALE_NAME_LENGTH),
        "allowNull": false,
        "defaultValue": "en-us"
    }
};

/**
 * @typedef {Object} GuildRow A Database Row for a specific Guild
 * @property {String} guildID The ID of the Guild
 * @property {String} prefix The prefix used by the Guild
 * @property {Boolean} shortcuts Whether or not shortcuts are enabled in the Guild
 * @property {String} locale The Guild's Locale
 */

module.exports = { MAX_DISCORD_ID_LENGTH, MAX_PREFIX_LENGTH, MAX_LOCALE_NAME_LENGTH, GuildModel };
