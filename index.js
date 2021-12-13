const dotenv = require("dotenv");
dotenv.config();

const { Client, RegisterEventListeners } = require("./Client.js");
const { RegisterCommands } = require("./Commands.js");
const { RegisterLocales } = require("./Localization.js");
const db = require("./Database.js");

(async () => {
    await db.Start({
        "mode": process.env["DB_MODE"],
        "logging": false,
        "sqlite": {
            "storage": process.env["SQLITE_STORAGE"]
        }
    });
    
    RegisterLocales();
    RegisterCommands();
    RegisterEventListeners();
    Client.login();
})();
