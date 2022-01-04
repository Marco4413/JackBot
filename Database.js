const SQLite = require("./databases/SQLite.js");
const MariaDB = require("./databases/MariaDB.js");
const Definitions = require("./DatabaseDefinitions.js");
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


const _Models = {
    /** @type {ModelCtor<Model>} */
    "guild": null,
    /** @type {ModelCtor<Model>} */
    "counter": null
};

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
    _Models.guild = _DBInstance.define("Guild", Definitions.GuildModel);
    _Models.counter = _DBInstance.define("Counter", Definitions.CounterModel, { "timestamps": true });
    
    if (settings.dropDatabase) {
        await _Models.guild.drop();
        await _Models.counter.drop();
    }

    await _Models.guild.sync(syncOptions);
    await _Models.counter.sync(syncOptions);

    // Trying to authenticate to the Database
    await _DBInstance.authenticate();
};

// #endregion

/**
 * Gets one Row from the Database
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table to get the row from
 * @param {U} [where] The attributes that the row should have
 * @returns {U|undefined} The Row or undefined if none was found
 */
const GetRow = async (table, where = { }) => {
    _EnsureStart();
    const instance = await _Models[table].findOne({ where });
    return instance?.get();
};

/**
 * Gets all Rows from the Database
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table to get the rows from
 * @param {U} [where] The attributes that the rows should have
 * @returns {U[]} The Rows
 */
const GetRows = async (table, where = { }) => {
    _EnsureStart();
    const instances = await _Models[table].findAll({ where });
    return instances.map(m => m.get());
};

/**
 * Gets one Row or creates it from the database
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table to get or create the row in
 * @param {U} [where] The attributes that the row should have
 * @param {U} [defaults] The default values for the row ( If it gets created )
 * @returns {U} The Row
 */
const GetOrCreateRow = async (table, where = { }, defaults = where) => {
    _EnsureStart();
    const [ instance ] = await _Models[table].findOrCreate({ where, defaults });
    return instance?.get();
};

/**
 * Sets the specified Attributes to the specified Row and returns the new Row
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table where the row is in
 * @param {U} [where] The attributes that the row to modify should have
 * @param {U} [attributes] The new attributes for the row ( Undefined keys don't change attributes )
 * @returns {U|undefined} The modified Row or undefined if none
 */
const SetRowAttr = async (table, where = { }, attributes = { }) => {
    _EnsureStart();
    const instance = await _Models[table].findOne({ where });
    if (instance === null) return undefined;

    for (const key of Object.keys(attributes))
        instance.set(key, attributes[key]);
    await instance.save();
    return instance.get();
};

/**
 * Creates a Row with the specified values
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table to create the row in
 * @param {U} [values] The values to create the row with
 * @returns {U|undefined} The created Row or undefined if none was created
 */
const CreateRow = async (table, values = { }) => {
    _EnsureStart();
    const counter = await GetRow(table, values);
    if (counter !== undefined) return undefined;

    const instance = await _Models[table].create(values);
    return instance.get();
};

/**
 * Removes all specified Rows
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table to remove the rows from
 * @param {U} [where] The attributes that the Rows to remove should have
 * @returns {Number} The count of Rows Removed
 */
const RemoveRows = async (table, where = { }) => {
    _EnsureStart();
    return await _Models[table].destroy({ where });
};

module.exports = {
    IsStarted, Start,
    GetRow, GetRows, GetOrCreateRow,
    SetRowAttr, CreateRow, RemoveRows
};
