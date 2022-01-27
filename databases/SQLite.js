const { Sequelize, DataTypes } = require("sequelize");

/**
 * @typedef {Object} SQLiteSettings SQLite Database Settings
 * @property {String} storage The File Location for the SQLite Database
 */

/**
 * @typedef {import("../Database.js").SequelizeLogging} SequelizeLogging
 * @typedef {import("../Database.js").DatabaseWrapper} WrappedDatabase
 */

/**
 * @param {SQLiteSettings} settings
 * @param {SequelizeLogging} logging
 * @returns {WrappedDatabase}
 */
module.exports = (settings, logging) => {
    if (typeof settings !== "object") throw new Error("Settings must be Specified for SQLite Database.");
    if (typeof settings.storage !== "string") throw new Error("File Pos Must be Specified for SQLite Database.");
    
    const instance = new Sequelize({
        "dialect": "sqlite",
        "storage": settings.storage,
        logging
    });

    instance.SafeDefine = (modelName, attributes, options) => {
        const primaryKeys = [ ];
        for (const column of Object.values(attributes)) {
            if (column.primaryKey)
                primaryKeys.push(column);
        }

        if (primaryKeys.length > 1) {
            for (const column of Object.values(primaryKeys)) {
                column.primaryKey = false;
            }

            attributes._sqliteCompoundIdFallback = {
                "primaryKey": true,
                "autoIncrement": true,
                "type": DataTypes.INTEGER,
                "allowNull": false
            };
        }
        
        return instance.define(modelName, attributes, options);
    };

    return instance;
};
