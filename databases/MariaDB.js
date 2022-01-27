const { Sequelize } = require("sequelize");

/**
 * @typedef {Object} MariaDBSettings MariaDB Database Settings
 * @property {String} host The Hostname of the Database
 * @property {Number} port The Port of the Database
 * @property {String} database The Database name
 * @property {String} username The Username of the User to log in with
 * @property {String} password The Password of the User to log in with
 */


/**
 * @typedef {import("../Database.js").SequelizeLogging} SequelizeLogging
 * @typedef {import("../Database.js").WrappedDatabase} WrappedDatabase
 */

/**
 * @param {MariaDBSettings} settings
 * @param {SequelizeLogging} logging
 * @returns {WrappedDatabase}
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
    const instance = new Sequelize({
        "dialect": "mariadb",
        "host": settings.host,
        "port": settings.port,
        "database": settings.database,
        "username": settings.username,
        "password": settings.password,
        logging
    });

    instance.SafeDefine = (modelName, attributes, options) =>
        instance.define(modelName, attributes, options);

    return instance;
};
