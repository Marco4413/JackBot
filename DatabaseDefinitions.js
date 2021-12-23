const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;

// This should be sage, IDs are 64bit Numbers and the biggest 64bit Number shouldn't
//  have more then 20 digits so we also have room to spare
const MAX_SNOWFLAKE_LENGTH = 24;
const MAX_PREFIX_LENGTH = 6;
const MAX_LOCALE_NAME_LENGTH = 8;

const GuildModel = {
    "id": {
        "primaryKey": true,
        "type": DataTypes.STRING(MAX_SNOWFLAKE_LENGTH),
        "allowNull": false // This should be done automatically
    },
    "prefix": {
        "type": DataTypes.STRING(MAX_PREFIX_LENGTH),
        "defaultValue": "!",
        "allowNull": false
    },
    "shortcuts": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": true,
        "allowNull": false
    },
    "locale": {
        "type": DataTypes.STRING(MAX_LOCALE_NAME_LENGTH),
        "defaultValue": "en-us",
        "allowNull": false
    }
};

const CounterModel = {
    "channelId": {
        "primaryKey": true,
        "type": DataTypes.STRING(MAX_SNOWFLAKE_LENGTH),
        "allowNull": false
    },
    "guildId": {
        "type": DataTypes.STRING(MAX_SNOWFLAKE_LENGTH),
        "allowNull": false
    },
    "count": {
        "type": DataTypes.BIGINT,
        "defaultValue": 0,
        "allowNull": false
    },
    "bestCount": {
        "type": DataTypes.BIGINT,
        "defaultValue": 0,
        "allowNull": false
    },
    "allowMessages": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": true,
        "allowNull": false
    }
};

/**
 * @typedef {Object} GuildRow A Database Row for a specific Guild
 * @property {String} id The ID of the Guild
 * @property {String} prefix The prefix used by the Guild
 * @property {Boolean} shortcuts Whether or not shortcuts are enabled in the Guild
 * @property {String} locale The Guild's Locale
 */

/**
 * @typedef {Object} CounterRow A Database Row for a specific Counter
 * @property {String} channelId The ID of the Counter's Channel
 * @property {String} guildId The ID of the Guild this Counter belongs to
 * @property {BigInt} count The current Count of this Counter
 * @property {BigInt} bestCount The best Count that this Counter has reached
 * @property {Boolean} allowMessages
 * @property {Date} updatedAt
 */

module.exports = { MAX_SNOWFLAKE_LENGTH, MAX_PREFIX_LENGTH, MAX_LOCALE_NAME_LENGTH, GuildModel, CounterModel };
