const dotenv = require("dotenv");
dotenv.config();

const Logger = require("./Logger.js");
const { StartRichPresence } = require("./RichPresence.js");
const { Client, RegisterEventListeners } = require("./Client.js");
const { RegisterCommands } = require("./Commands.js");
const { RegisterLocales } = require("./Localization.js");
const db = require("./Database.js");

(async () => {
    Logger.TimeStart("StartupTime");

    Logger.GroupStart("Database Start:");
    await db.Start({
        "mode": process.env["DB_MODE"],
        "logging": Logger.Debug,
        "sqlite": {
            "storage": process.env["SQLITE_STORAGE"]
        },
        "mariadb": {
            "host": process.env["MARIADB_HOST"],
            "port": Number( process.env["MARIADB_PORT"] ),
            "database": process.env["MARIADB_DATABASE"],
            "username": process.env["MARIADB_USERNAME"],
            "password": process.env["MARIADB_PASSWORD"]
        }
    });
    Logger.GroupEnd();
    
    Logger.GroupStart("Registering External Dependencies:");

    Logger.GroupStart("Locales:");
    RegisterLocales();
    Logger.GroupEnd();
    
    Logger.GroupStart("Commands:");
    RegisterCommands();
    Logger.GroupEnd();
    
    Logger.GroupStart("Event Listeners:");
    RegisterEventListeners();
    Logger.GroupEnd();
    
    Logger.GroupEnd();
    
    Logger.GroupStart("Client Login:");
    await Client.login();
    Logger.GroupEnd();

    Logger.GroupStart("Rich Presence:");
    await StartRichPresence();
    Logger.GroupEnd();
    
    Logger.TimeEnd("StartupTime");
})().catch(async error => {
    // Logging any error that happens within the main function
    Logger.Error(error.stack);
    process.emit("SIGINT");
});
