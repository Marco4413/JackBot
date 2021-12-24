const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;

// This should be safe, IDs are 64bit Numbers and the biggest 64bit Number shouldn't
//  have more then 20 digits so we also have room to spare
const MAX_SNOWFLAKE_LENGTH = 24;
const MAX_PREFIX_LENGTH = 6;
const MAX_LOCALE_NAME_LENGTH = 8;

const _SNOWFLAKE_DATATYPE = DataTypes.STRING(MAX_SNOWFLAKE_LENGTH);

const GuildModel = {
    "id": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
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
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "guildId": {
        "type": _SNOWFLAKE_DATATYPE,
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
    "lastMemberId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "allowMessages": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": true,
        "allowNull": false
    },
    "alternateMember": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
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
 * @property {String} lastMemberId The Id of the Last Member who changed the count
 * @property {Boolean} allowMessages Whether or not to allow NaN messages in the Counter's Channel
 * @property {Boolean} alternateMember Whether or not the Last Member who changed the count can do it more than once in a row
 * @property {Date} updatedAt The last time this Row was updated
 */

module.exports = { MAX_SNOWFLAKE_LENGTH, MAX_PREFIX_LENGTH, MAX_LOCALE_NAME_LENGTH, GuildModel, CounterModel };
