const dotenv = require("dotenv");
dotenv.config();

const { Client, RegisterEventListeners } = require("./Client.js");
const db = require("./Database.js");

db.SetMode(db.Mode.LOCAL);
db.Start({
    "filePos": "./data/database.json",
    "localSaveInterval": 1800e3 // Save Every 30 Minutes
});

RegisterEventListeners();
Client.login();
