const SQLite = require("./databases/SQLite.js");
const MariaDB = require("./databases/MariaDB.js");
const DBDefinitions = require("./DatabaseDefinitions.js");
const { Sequelize, Model, ModelCtor, SyncOptions } = require("sequelize");

/** @typedef {(boolean|((sql: string, timing?: number) => Void))?} SequelizeLogging */

/**
 * Generic Settings for Databases
 * @typedef {Object} DatabaseSettings
 * @property {"sqlite"|"mariadb"} mode The Database mode
 * @property {Boolean} [dropDatabase] Whether or not to drop the Database
 * @property {SequelizeLogging} [logging] A Logger for Sequelize
 * @property {SQLite.SQLiteSettings} [sqlite] Specific Database Settings for "sqlite" mode
 * @property {MariaDB.MariaDBSettings} [mariadb] Specific Database Settings for "mariadb" mode
 */

/** @type {Sequelize} */
let _DBInstance = null;

/** @type {ModelCtor<Model>} */
let _Guild = null;
/** @type {ModelCtor<Model>} */
let _Counter = null;

// #region Basic Methods

/**
 * Returns whether or not the Database was started
 * @returns {Boolean} Whether or not the Database was started
 */
const IsStarted = () => _DBInstance !== null;

const _EnsureStart = () => {
    if (!IsStarted()) throw Error("Database wasn't yet Started.");
};

/**
 * Starts the Database with the specified settings
 * @param {DatabaseSettings} settings The settings to start the Database with
 */
const Start = async (settings) => {
    if (IsStarted()) throw new Error("Can't Start Database, it's Already Running.");

    switch (settings.mode) {
    case "sqlite":
        _DBInstance = SQLite(settings.sqlite, settings.logging);
        break;
    case "mariadb":
        _DBInstance = MariaDB(settings.mariadb, settings.logging);
        break;
    default:
        throw new Error("Database Mode not Valid.");
    }

    /** @type {SyncOptions} */
    const syncOptions = { "alter": true };

    // Defining and Syncing Models
    _Guild = _DBInstance.define("Guild", DBDefinitions.GuildModel);
    _Counter = _DBInstance.define("Counter", DBDefinitions.CounterModel, { "timestamps": true });
    
    if (settings.dropDatabase) {
        await _Guild.drop();
        await _Counter.drop();
    }

    await _Guild.sync(syncOptions);
    await _Counter.sync(syncOptions);

    // Trying to authenticate to the Database
    await _DBInstance.authenticate();
};

// #endregion

/**
 * @param {String} id
 * @returns {Model}
 */
const _FindOrCreateGuild = async (id) => {
    const [ instance ] = await _Guild.findOrCreate({
        "where":    { id },
        "defaults": { id }
    });
    return instance;
};

/**
 * @template {Object} T
 * @param {Model} model
 * @param {T} attributes
 * @returns {T}
 */
const _SetModelAttr = async (model, attributes) => {
    for (const key of Object.keys(attributes))
        model.set(key, attributes[key]);
    await model.save();
    return model.get();
};

// #region Guild Methods

/**
 * Creates an entry for the Guild with the specified id if it doesn't exist and returns it
 * @param {String} id The id of the Guild to Get or Create
 * @returns {DBDefinitions.GuildRow} The Row of the Guild
 */
const GetGuild = async (id) => {
    _EnsureStart();
    const instance = await _FindOrCreateGuild(id);
    return instance.get();
};

/**
 * Sets the specified Guild Attributes
 * @param {String} id The Guild to set the attributes for
 * @param {DBDefinitions.GuildRow} attributes The Attributes to set ( undefined keys don't change attributes )
 * @returns {DBDefinitions.GuildRow} The updated Guild Row
 */
const SetGuildAttr = async (id, attributes) => {
    _EnsureStart();
    const instance = await _FindOrCreateGuild(id);
    return await _SetModelAttr(instance, attributes);
};

/**
 * Removes the specified Guild from the Database
 * @param {String} id The id of the Guild to Remove
 * @returns {Boolean} Whether or not the Guild was removed
 */
const RemoveGuild = async (id) => {
    _EnsureStart();
    await RemoveGuildCounters(id);
    return await _Guild.destroy({ "where": { id } }) > 0;
};

// #endregion

// #region Counter Methods

/**
 * Creates a new Counter for the specified Guild and Channel
 * @param {String} guildId The id of the Guild to create the Counter for
 * @param {String} channelId The id of the Channel to create the Counter for
 * @returns {DBDefinitions.CounterRow|undefined} The new Counter or undefined if one was present
 */
const CreateGuildCounter = async (guildId, channelId) => {
    _EnsureStart();
    const counter = await GetGuildCounter(guildId, channelId);
    if (counter !== undefined) return undefined;

    const instance = await _Counter.create({
        channelId, guildId
    });
    return instance.get();
};

/**
 * Removes the Counter for the specified Guild and Channel
 * @param {String} guildId The id of the Guild to remove the Counter for
 * @param {String} channelId The id of the Channel to remove the Counter for
 * @returns {Boolean} Whether or not the Guild's Counter was removed
 */
const RemoveGuildCounter = async (guildId, channelId) => {
    _EnsureStart();
    return await _Counter.destroy({ "where": { guildId, channelId } }) > 0;
};

/**
 * Removes all Counters in the specified Guild
 * @param {String} guildId The id of the Guild to remove the Counters for
 * @returns {Boolean} Whether or not one Guild Counter was removed
 */
const RemoveGuildCounters = async (guildId) => {
    _EnsureStart();
    return await _Counter.destroy({ "where": { guildId } }) > 0;
};

/**
 * Returns the Counter for the specified Guild and Channel
 * @param {String} guildId The id of the Guild to get the Counter for
 * @param {String} channelId The id of the Channel to get the Counter for
 * @returns {DBDefinitions.CounterRow|undefined} The Counter for the specified Guild and Channel or undefined if none
 */
const GetGuildCounter = async (guildId, channelId) => {
    _EnsureStart();
    const instance = await _Counter.findOne({
        "where": { guildId, channelId }
    });
    return instance === null ? undefined : instance.get();
};

/**
 * Returns the Counters for the specified Guild
 * @param {String} guildId The id of the Guild to get the Counters for
 * @returns {DBDefinitions.CounterRow[]} The Counters for the specified Guild
 */
const GetGuildCounters = async (guildId) => {
    _EnsureStart();
    const instances = await _Counter.findAll({
        "where": { guildId }
    });
    return instances.map(m => m.get());
};

/**
 * Sets the specified Counter Attributes
 * @param {String} guildId The id of the Guild to set the Counter attributes for
 * @param {String} channelId The id of the Channel to set the Counter attributes for
 * @param {DBDefinitions.CounterRow} attributes The Attributes to set
 * @returns {DBDefinitions.CounterRow|undefined} The updated Counter Row
 */
const SetGuildCounterAttr = async (guildId, channelId, attributes) => {
    _EnsureStart();
    const instance = await _Counter.findOne({
        "where": { guildId, channelId }
    });
    
    if (instance === null) return undefined;
    return await _SetModelAttr(instance, attributes);
};

// #endregion

module.exports = {
    IsStarted, Start,
    GetGuild, SetGuildAttr, RemoveGuild,
    CreateGuildCounter, RemoveGuildCounter, RemoveGuildCounters, GetGuildCounter, GetGuildCounters, SetGuildCounterAttr
};
