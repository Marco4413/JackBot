const dotenv = require("dotenv");
dotenv.config();

const client = require("./Client.js");
const db = require("./Database.js");

db.SetMode(db.Mode.LOCAL);
db.Start({
    "filePos": "./data/database.json",
    "localSaveInterval": 1800e3 // Save Every 30 Minutes
});

const newGuild = db.AddGuildByID("MySuperCoolGuildID");
console.log(`Dummy Guild Prefix: "${ newGuild.prefix }"`);

client.login();
