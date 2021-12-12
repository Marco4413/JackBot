const dotenv = require("dotenv");
dotenv.config();

const { Client, RegisterEventListeners } = require("./Client.js");
const { RegisterCommands } = require("./Commands.js");
const db = require("./Database.js");

db.SetMode(db.Mode.LOCAL);
db.Start({
    "filePos": "./data/database.json",
    "localSaveInterval": 1800e3 // Save Every 30 Minutes
});

RegisterCommands();
RegisterEventListeners();
Client.login();
