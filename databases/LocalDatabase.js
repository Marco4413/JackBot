const fs = require("fs");

/** @typedef {import("../Database.js").DatabaseSettings} DatabaseSettings */
/** @typedef {import("../Database.js").Guild} Guild */

// #region Specific Implementation

/** @type {DatabaseSettings} */
let _DBSettings = undefined;
let _Data = { };

let _SaveInterval = null;

const _IsStarted = () => _DBSettings !== undefined;

const _EnsureStart = () => {
    if (!_IsStarted()) throw Error("Cannot Interact with a DB that was not yet Started.");
}

const _SaveDatabase = () => {
    if (_IsStarted()) {
        fs.writeFileSync(
            _DBSettings.filePos,
            JSON.stringify(_Data, undefined, 0),
            { "encoding": "utf8" }
        );
        console.log("Database Saved.");
    }
}

const _StartAutosave = () => {
    if (_SaveInterval === null) {
        _SaveInterval = setInterval(_SaveDatabase, _DBSettings.localSaveInterval);
    }
}

const _StopAutosave = () => {
    clearInterval(_SaveInterval);
    _SaveInterval = null;
}

const _LoadDatabase = () => {
    if (fs.existsSync(_DBSettings.filePos)) {
        _Data = JSON.parse(
            fs.readFileSync(_DBSettings.filePos, { "encoding": "utf8" })
        );
    }
}

const _StopDatabase = () => {
    _StopAutosave();
    _SaveDatabase();
    console.log("Database Stopped.");
}

process.once("SIGINT", _StopDatabase);
process.once("SIGQUIT", _StopDatabase);

// #endregion

// #region Common Methods Implementation

/**
 * @param {DatabaseSettings} settings
 */
const Start = (settings) => {
    if (typeof settings.filePos !== "string")
        throw new Error("Invalid File Pos for Local Database.");
    if (typeof settings.localSaveInterval !== "number")
        throw new Error("Invalid Save Interval for Local Database.");
    _DBSettings = settings;
    
    if (!_DBSettings.filePos.endsWith(".json"))
        _DBSettings.filePos += ".json";
    
    _LoadDatabase();
    _StartAutosave();
}

/**
 * @param {String} guildID
 * @returns {Guild|undefined}
 */
const GetGuildByID = (guildID) => {
    _EnsureStart();
    return _Data[guildID];
}

/**
 * @param {String} guildID
 * @param {Guild} guildEntry
 * @param {Boolean} [forceAdd]
 * @returns {Guild}
 */
const AddGuildByID = (guildID, guildEntry, forceAdd = false) => {
    _EnsureStart();
    if (forceAdd || _Data[guildID] === undefined) {
        _Data[guildID] = guildEntry;
    }

    return _Data[guildID];
}

/**
 * @param {String} guildID
 * @param {(keyof Guild)[]} attributes
 * @param {Any[]} values
 * @returns {Guild|undefined}
 */
const SetGuildAttrByID = (guildID, attributes, values) => {
    if (_Data[guildID] === undefined) return undefined;

    const guild = _Data[guildID];
    for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        const value = i < values.length ? values[i] : null;
        guild[attr] = value;
    }
    
    return guild;
}

// #endregion

module.exports = {
    Start, GetGuildByID, AddGuildByID, SetGuildAttrByID
}
