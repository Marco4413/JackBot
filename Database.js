const LocalDatabase = require("./databases/LocalDatabase.js");

const Mode = {
    "NONE": 0,
    "LOCAL": 1,
    "REMOTE": 2
};

let _Started = false;
let _DBMode = Mode.NONE;

/**
 * @param {Number} mode A value from the {@link Mode} enum
 */
const SetMode = (mode) => {
    if (_Started) throw new Error("Can't change Database Mode if Database was already started.");
    _DBMode = mode;
}

const _ExecuteByMode = (localcb, remotecb, ...arguments) => {
    switch (_DBMode) {
        case Mode.LOCAL:
            if (localcb === undefined)
                throw new Error("LOCAL Mode is not yet Implemented.");
            return localcb(...arguments);
        case Mode.REMOTE:
            if (remotecb === undefined)
                throw new Error("REMOTE Mode is not yet Implemented.");
            return remotecb(...arguments);
        default:
            throw new Error("Invalid Database Mode Specified.");
    }
}

/**
 * @typedef {Object} DatabaseSettings
 * @property {String} [filePos]
 * @property {Number} [localSaveInterval]
 */

// #region Common Methods Implementation

/**
 * @param {DatabaseSettings} settings
 */
const Start = (settings) => {
    if (_Started) throw new Error("Can't Start Database, it's Already Running.");
    if (_DBMode === Mode.NONE) throw new Error("Can't Start Database, no Mode Specified.");

    _ExecuteByMode(
        LocalDatabase.Start, undefined, settings
    );

    _Started = true;
}

/**
 * @typedef {Object} Guild
 * @property {String} prefix
 */

/**
 * @param {String} guildID
 * @returns {Guild|undefined}
 */
const GetGuildByID = (guildID) => {
    return _ExecuteByMode(
        LocalDatabase.GetGuildByID, undefined, guildID
    );
}

/**
 * @param {String} guildID
 * @param {Guild} [guildEntry]
 * @param {Boolean} [forceAdd]
 * @returns {Guild}
 */
const AddGuildByID = (guildID, guildEntry, forceAdd = false) => {
    if (guildEntry === undefined) {
        guildEntry = {
            "prefix": "!"
        };
    }

    return _ExecuteByMode(
        LocalDatabase.AddGuildByID, undefined,
        guildID, guildEntry, forceAdd
    );
}

/**
 * @param {String} guildID
 * @param {(keyof Guild)[]} attributes
 * @param {Any[]} values
 * @returns {Guild}
 */
const SetGuildAttrByID = (guildID, attributes, values) => {
    return _ExecuteByMode(
        LocalDatabase.SetGuildAttrByID, undefined,
        guildID, attributes, values
    );
}

// #endregion

module.exports = { Mode, SetMode, Start, GetGuildByID, AddGuildByID, SetGuildAttrByID };
