const dotenv = require("dotenv");
dotenv.config();

const { Client, RegisterEventListeners } = require("./Client.js");
const { RegisterCommands } = require("./Commands.js");
const db = require("./Database.js");

(async () => {
    await db.Start({
        "mode": "sqlite",
        "logging": false,
        "sqlite": {
            "filePos": "./data/database.sqlite"
        }
    });
    
    RegisterCommands();
    RegisterEventListeners();
    Client.login();
})();
