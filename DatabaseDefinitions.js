const Sequelize = require("sequelize");
const Logger = require("./Logger.js");
const { DataTypes } = Sequelize;
const Utils = require("./Utils.js");

// This should be safe, IDs are 64bit Numbers and the biggest 64bit Number shouldn't
//  have more then 20 digits so we also have room to spare
const MAX_SNOWFLAKE_LENGTH = 24;
const MAX_PREFIX_LENGTH = 6;
const MAX_LOCALE_NAME_LENGTH = 8;
const MAX_MANAGEABLE_ROLES = 16;

const _SNOWFLAKE_DATATYPE = DataTypes.STRING(MAX_SNOWFLAKE_LENGTH);
const _MANAGEABLE_ROLES_DATATYPE = DataTypes.STRING(
    MAX_MANAGEABLE_ROLES * MAX_SNOWFLAKE_LENGTH + MAX_MANAGEABLE_ROLES + 1
    // All role Ids + All semicolons + Semicolon at the end
);

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
    "nitroBoostChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "suggestionChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "suggestionResultChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "privateChannelEveryoneTemplateRoleId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "privateChannelOwnerTemplateRoleId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "privateChannelCategoryId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "privateVoiceCreateChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "isSoundAccessBlacklist": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": true,
        "allowNull": true
    },
    "isChannelAccessBlacklist": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": true
    },
    "isRoleAccessBlacklist": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": true
    },
    "isSuggestionAccessBlacklist": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": true,
        "allowNull": true
    },
    "isSuggestionManagerAccessBlacklist": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
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
    "lastMessageId": {
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

const UserModel = {
    "guildId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "userId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "privateVoiceChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "privateTextChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "inSoundAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inChannelAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inRoleAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inSuggestionAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inSuggestionManagerAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    }
};

const RoleModel = {
    "guildId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "roleId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "manageableRoles": {
        "type": _MANAGEABLE_ROLES_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "inSoundAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inChannelAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inRoleAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inSuggestionAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    },
    "inSuggestionManagerAccessList": {
        "type": DataTypes.BOOLEAN,
        "defaultValue": false,
        "allowNull": false
    }
};

const ChannelModel = {
    "guildId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "channelId": {
        "primaryKey": true,
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "joinNotificationChannelId": {
        "type": _SNOWFLAKE_DATATYPE,
        "defaultValue": null,
        "allowNull": true
    },
    "joinNotificationText": {
        "type": DataTypes.TEXT,
        "defaultValue": null,
        "allowNull": true
    }
};

const SuggestionModel = {
    "id": {
        "primaryKey": true,
        "autoIncrement": true,
        "type": DataTypes.INTEGER,
        "allowNull": false
    },
    "guildId": {
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "authorId": {
        "type": _SNOWFLAKE_DATATYPE,
        "allowNull": false
    },
    "messageId": {
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
 * @property {String?} nitroBoostChannelId The Id of the Channel where Nitro Boost Announcements are sent
 * @property {String?} suggestionChannelId The Id of the Channel where Suggestions are stored
 * @property {String?} suggestionResultChannelId The Id of the Channel where Suggestion Results are stored
 * @property {String?} privateChannelEveryoneTemplateRoleId The template role for everyone on private channels
 * @property {String?} privateChannelOwnerTemplateRoleId The template role for the channel owner on private channels
 * @property {String?} privateChannelCategoryId The Id of the category Private Channels should be created under
 * @property {String?} privateVoiceCreateChannelId The Id of the Voice Channel to create a VC upon user connection
 * @property {Boolean} isSoundAccessBlacklist Whether or not the Sound Access List is a Blacklist
 * @property {Boolean} isChannelAccessBlacklist Whether or not the Channel Access List is a Blacklist
 * @property {Boolean} isRoleAccessBlacklist Whether or not the Role Access List is a Blacklist
 * @property {Boolean} isSuggestionAccessBlacklist Whether or not the Suggestion Access List is a Blacklist
 * @property {Boolean} isSuggestionManagerAccessBlacklist Whether or not the Suggestion Manager Access List is a Blacklist
 * @typedef {DatabaseRow&_GuildRowType} GuildRow A Database Row for a specific Guild
 */

/**
 * @typedef {Object} _CounterRowType
 * @property {String} channelId The Id of the Counter's Channel
 * @property {String} guildId The Id of the Guild this Counter belongs to
 * @property {BigInt} count The current Count of this Counter
 * @property {BigInt} bestCount The best Count that this Counter has reached
 * @property {String} lastMemberId The Id of the Last Member who changed the count
 * @property {String} lastMessageId The Id of the Last Message that changed the count
 * @property {Boolean} allowMessages Whether or not to allow NaN messages in the Counter's Channel
 * @property {Boolean} allowErrors Whether or not to allow wrong numbers in the Counter's Channel
 * @property {Boolean} alternateMember Whether or not the Last Member who changed the count can do it more than once in a row
 * @typedef {DatabaseRow&_CounterRowType} CounterRow A Database Row for a specific Counter
 */

/**
 * @typedef {Object} _UserRowType
 * @property {String} guildId The Id of the Guild this User belongs to
 * @property {String} userId The Id of the User
 * @property {String?} privateVoiceChannelId The User's Private Voice Channel Id
 * @property {String?} privateTextChannelId The User's Private Text Channel Id
 * @property {Boolean} inSoundAccessList Whether or not this User is in the Sound Access List
 * @property {Boolean} inChannelAccessList Whether or not this User is in the Channel Access List
 * @property {Boolean} inRoleAccessList Whether or not this User is in the Role Access List
 * @property {Boolean} inSuggestionAccessList Whether or not this User is in the Suggestion Access List
 * @property {Boolean} inSuggestionManagerAccessList Whether or not this User is in the Suggestion Manager Access List
 * @typedef {DatabaseRow&_UserRowType} UserRow
 */

/**
 * @typedef {Object} _RoleRowType
 * @property {String} guildId The Id of the Guild this Role belongs to
 * @property {String} roleId The Id of the Role
 * @property {String} manageableRoles A List of Role Ids that this Role can manage with the Role Command. The list looks like this: ";role1;role2;"
 * @property {Boolean} inSoundAccessList Whether or not this Role is in the Sound Access List
 * @property {Boolean} inChannelAccessList Whether or not this Role is in the Channel Access List
 * @property {Boolean} inRoleAccessList Whether or not this Role is in the Role Access List
 * @property {Boolean} inSuggestionAccessList Whether or not this Role is in the Suggestion Access List
 * @property {Boolean} inSuggestionManagerAccessList Whether or not this Role is in the Suggestion Manager Access List
 * @typedef {DatabaseRow&_RoleRowType} RoleRow
 */

/**
 * TODO: Merge CounterRow?
 * @typedef {Object} _ChannelRowType
 * @property {String} guildId The Id of the Guild this Channel belongs to
 * @property {String} channelId The Id of the Channel
 * @property {String} joinNotificationChannelId The Id of the Channel which will receive notifications of this one
 * @property {String} joinNotificationText The text to send to the Notification Channel
 * @typedef {DatabaseRow&_ChannelRowType} ChannelRow
 */

/**
 * @typedef {Object} _SuggestionRowType
 * @property {String} id The Id of the Suggestion
 * @property {String} guildId The Id of the Guild this Suggestion belongs to
 * @property {String} authorId The Id of the User this Suggestion was submitted by
 * @property {String} messageId The Id of the Suggestion's message (Sent by the bot)
 * @typedef {DatabaseRow&_SuggestionRowType} SuggestionRow
 */

/**
 * @typedef {Object} DatabaseTables
 * @property {GuildRow} guild
 * @property {CounterRow} counter
 * @property {UserRow} user
 * @property {RoleRow} role
 * @property {ChannelRow} channel
 * @property {SuggestionRow} suggestion
 */

module.exports = {
    MAX_SNOWFLAKE_LENGTH, MAX_PREFIX_LENGTH, MAX_LOCALE_NAME_LENGTH,
    MAX_MANAGEABLE_ROLES,
    GuildModel, CounterModel, UserModel, RoleModel, ChannelModel, SuggestionModel
};
