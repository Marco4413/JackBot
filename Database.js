const SQLite = require("./databases/SQLite.js");
const MariaDB = require("./databases/MariaDB.js");
const Definitions = require("./DatabaseDefinitions.js");
const { Sequelize, Model, ModelStatic, SyncOptions, ModelAttributes, ModelOptions } = require("sequelize");

/**
 * @typedef {(modelName: String, attributes: ModelAttributes<Model<Any, Any>>, options: ModelOptions<Model<Any, Any>>?) => ModelStatic<Model>} DefineWrapper
 * @typedef {(boolean|((sql: string, timing?: number) => Void))?} SequelizeLogging
 * @typedef {Sequelize&{ SafeDefine: DefineWrapper }} WrappedDatabase
 */

/**
 * Generic Settings for Databases
 * @typedef {Object} DatabaseSettings
 * @property {"sqlite"|"mariadb"} mode The Database mode
 * @property {Boolean} [dropDatabase] Whether or not to drop the Database
 * @property {SequelizeLogging} [logging] A Logger for Sequelize
 * @property {SQLite.SQLiteSettings} [sqlite] Specific Database Settings for "sqlite" mode
 * @property {MariaDB.MariaDBSettings} [mariadb] Specific Database Settings for "mariadb" mode
 */

/** @type {DatabaseWrapper} */
let _DBInstance = null;

const _Models = {
    /** @type {ModelStatic<Model>} */
    "guild": null,
    /** @type {ModelStatic<Model>} */
    "counter": null,
    /** @type {ModelStatic<Model>} */
    "user": null,
    /** @type {ModelStatic<Model>} */
    "role": null
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
    /** @type {ModelOptions} */
    const modelOptions = { "timestamps": true };

    // Defining and Syncing Models
    _Models.guild   = _DBInstance.SafeDefine("Guild"  , Definitions.GuildModel  , modelOptions);
    _Models.counter = _DBInstance.SafeDefine("Counter", Definitions.CounterModel, modelOptions);
    _Models.user    = _DBInstance.SafeDefine("User"   , Definitions.UserModel   , modelOptions);
    _Models.role    = _DBInstance.SafeDefine("Role"   , Definitions.RoleModel   , modelOptions);
    
    for (const model of Object.values(_Models)) {
        if (settings.dropDatabase)
            await model.drop();
        await model.sync(syncOptions);
    }

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
 * Sets the specified Attributes to the specified Rows and returns the new Rows
 * @template {keyof Definitions.DatabaseTables} T
 * @template {Definitions.DatabaseTables[T]} U
 * @param {T} table The table where the rows are in
 * @param {U} [where] The attributes that the rows to modify should have
 * @param {U} [attributes] The new attributes for the rows ( Undefined keys don't change attributes )
 * @returns {U[]} The modified Rows
 */
const SetRowsAttr = async (table, where = { }, attributes = { }) => {
    _EnsureStart();
    const instances = await _Models[table].findAll({ where });

    const newRows = [ ];
    for (let i = 0; i < instances.length; i++) {
        for (const key of Object.keys(attributes))
            instances[i].set(key, attributes[key]);
        await instances[i].save();
        
        newRows.push(
            instances[i].get()
        );
    }
    return newRows;
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
    SetRowAttr, SetRowsAttr,
    CreateRow, RemoveRows
};
