const Sequelize = require("sequelize");
const Logger = require("./Logger.js");
const { DataTypes } = Sequelize;
const Utils = require("./Utils.js");

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
        "defaultValue": Utils.GetEnvVariable("DEFAULT_LOCALE", (value, defaultValue) => {
            if (typeof value !== "string") return undefined;
            else if (value.length <= MAX_LOCALE_NAME_LENGTH)
                return value;
            else return defaultValue;
        }, "en-us", Logger.Warn),
        "allowNull": false
    },
    "soundBlacklistRoleId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "nitroBoostChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
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
    "allowErrors": {
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

const SoundModel = {
    "guildId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "soundBlacklistRoleId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    }
};

/**
 * @typedef {Object} DatabaseRow A Generic Database Row
 * @property {Date} createdAt The time this Row was created at
 * @property {Date} updatedAt The last time this Row was updated at
 */

/**
 * @typedef {Object} _GuildRowType
 * @property {String} id The Id of the Guild
 * @property {String} prefix The prefix used by the Guild
 * @property {Boolean} shortcuts Whether or not shortcuts are enabled in the Guild
 * @property {String} locale The Guild's Locale
 * @property {String} soundBlacklistRoleId The Id of the Blacklisted Role for Sound Commands
 * @property {String} nitroBoostChannelId The Id of the Channel where Nitro Boost Announcements are sent
 * @typedef {DatabaseRow&_GuildRowType} GuildRow A Database Row for a specific Guild
 */

/**
 * @typedef {Object} _CounterRowType
 * @property {String} channelId The Id of the Counter's Channel
 * @property {String} guildId The Id of the Guild this Counter belongs to
 * @property {BigInt} count The current Count of this Counter
 * @property {BigInt} bestCount The best Count that this Counter has reached
 * @property {String} lastMemberId The Id of the Last Member who changed the count
 * @property {Boolean} allowMessages Whether or not to allow NaN messages in the Counter's Channel
 * @property {Boolean} allowErrors Whether or not to allow wrong numbers in the Counter's Channel
 * @property {Boolean} alternateMember Whether or not the Last Member who changed the count can do it more than once in a row
 * @typedef {DatabaseRow&_CounterRowType} CounterRow A Database Row for a specific Counter
 */

/**
 * @typedef {Object} _SoundRowType
 * @property {String} guildId The Id of the Guild these Sound settings belong to
 * @property {String} blacklistRoleId The Id of the Blacklisted Role for Sound Commands
 * @typedef {DatabaseRow&_SoundRowType} SoundRow A Database Row for a specific Counter
 */

/**
 * @typedef {Object} DatabaseTables
 * @property {GuildRow} guild
 * @property {CounterRow} counter
 * @property {SoundRow} sound
 */

module.exports = {
    MAX_SNOWFLAKE_LENGTH, MAX_PREFIX_LENGTH, MAX_LOCALE_NAME_LENGTH,
    GuildModel, CounterModel, SoundModel
};
