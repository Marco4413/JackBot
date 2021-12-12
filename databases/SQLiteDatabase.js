const { Sequelize } = require("sequelize");

/**
 * @typedef {Object} SQLiteSettings SQLite Database Settings
 * @property {String} filePos The File Location for the SQLite Database
 */

/** @typedef {import("../Database.js").SequelizeLogging} SequelizeLogging */

/**
 * @param {SQLiteSettings} settings
 * @param {SequelizeLogging} logging
 * @returns {Sequelize}
 */
module.exports = (settings, logging) => {
    if (typeof settings !== "object") throw new Error("Settings must be Specified for SQLite Database.");
    if (typeof settings.filePos !== "string") throw new Error("File Pos Must be Specified for SQLite Database.");
    return new Sequelize({
        "dialect": "sqlite",
        "storage": settings.filePos,
        logging
    });
}
