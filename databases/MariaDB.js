const { Sequelize } = require("sequelize");

/**
 * @typedef {Object} MariaDBSettings MariaDB Database Settings
 * @property {String} host The Hostname of the Database
 * @property {Number} port The Port of the Database
 * @property {String} database The Database name
 * @property {String} username The Username of the User to log in with
 * @property {String} password The Password of the User to log in with
 */

/** @typedef {import("../Database.js").SequelizeLogging} SequelizeLogging */

/**
 * @param {MariaDBSettings} settings
 * @param {SequelizeLogging} logging
 * @returns {Sequelize}
 */
module.exports = (settings, logging) => {
    if (typeof settings !== "object") throw new Error("Settings must be Specified for MariaDB Database.");
    if (!(
        typeof settings.host === "string" &&
        typeof settings.port === "number" &&
        typeof settings.database === "string" &&
        typeof settings.username === "string" &&
        typeof settings.password === "string"
    )) throw new Error("A Valid Host, Port, Database, Username and Password Must be Specified for MariaDB Database.");
    return new Sequelize({
        "dialect": "mariadb",
        "host": settings.host,
        "port": settings.port,
        "database": settings.database,
        "username": settings.username,
        "password": settings.password,
        logging
    });
};
