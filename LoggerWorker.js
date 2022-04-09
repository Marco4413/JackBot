const fs = require("fs");
const { parentPort } = require("worker_threads");
const { JoinArray, GetFormattedDateComponents, FormatString } = require("./Utils.js");
const { Client: DiscordClient, Intents, TextChannel } = require("discord.js");

let _LogClient = new DiscordClient({
    "intents": Intents.FLAGS.GUILD_MEMBERS,
    "presence": {
        "status": "invisible"
    }
});

/** @type {TextChannel} */
let _LogChannel = null;

const _DiscordLog = async (message) => {
    if (!_LogClient.isReady() || _LogChannel == null) return;
    try {
        await _LogChannel.send("```" + message + "```");
    } catch (error) { /* Ignored */ }
};

const _INDENT_TEXT = " ";
let _CurrentIndent = 0;
let _LoggedLines = [ ];

/**
 * @typedef {"close"|"save"|"indent-change"|"message"} LoggerWorkerMessageType The Type of the Message sent to LoggerWorker
 */

/**
 * @typedef {Object} LoggerWorkerMessage A Message that can be sent to LoggerWorker
 * @property {LoggerWorkerMessageType} type The Type of the Message
 * @property {Number} indentDelta How much the indent has changed
 * @property {String} chalk The chalk to use
 * @property {String} prefix The prefix of the Log Message
 * @property {Boolean} chalkAll Whether or not to chalk the entire line
 * @property {Boolean} prefixColon Whether or not to add a colon at the end of the prefix
 * @property {String} message The message to log
 * @property {Boolean} logToDiscord Whether or not this message should be sent to the bot owner's DMs
 */

parentPort.on("message", /** @param {LoggerWorkerMessage} msg */ msg => {
    switch (msg.type) {
    case "close":
        parentPort.close();
        _LogClient.destroy();
        // Fall through to save
    case "save": {
        if (_LoggedLines.length === 0) return;

        const logData = JoinArray(_LoggedLines, "\n");
        _LoggedLines = [ ];

        const logDate = GetFormattedDateComponents(undefined, "-", "-", "_");
        const logDir = "./data/logs/" + logDate.date;

        fs.mkdirSync(logDir, { "recursive": true });
        fs.writeFileSync(`${logDir}/${logDate.date}T${logDate.time}.log.txt`, logData, { "flag": "w" });
        parentPort.postMessage({ "type": "save-complete" });
        break;
    }
    case "indent-change": {
        _CurrentIndent = Math.max(_CurrentIndent + msg.indentDelta, 0);
        break;
    }
    case "message": {
        const logDate = GetFormattedDateComponents();
        const indentStr = _INDENT_TEXT.repeat(_CurrentIndent);
        const fullPrefix = `[ ${logDate.date} ${logDate.time} ][ ${msg.prefix} ]`;
        const logMessage = msg.message.replace(/\n/g, "\n" + indentStr);
    
        const colon = ( msg.prefixColon ? ":" : "" ) + ( logMessage.length > 0 ? " " : "" );
        const loggedLine = indentStr + fullPrefix + colon + logMessage;
        _LoggedLines.push(loggedLine);
    
        if (msg.chalkAll)
            console.log(FormatString(msg.chalk, loggedLine));
        else console.log(indentStr + FormatString(msg.chalk, fullPrefix + colon) + logMessage);
        
        if (msg.logToDiscord)
            _DiscordLog(loggedLine);
        break;
    }
    }
});

(async () => {
    if (process.env["ENABLE_DM_LOGGING"] === "true") {
        _LogClient.once("ready", async client => {
            try {
                const logUser = await client.users.fetch(process.env["OWNER_ID"]);
                _LogChannel = logUser.dmChannel ?? (await logUser.createDM());
            } catch (error) {
                _LogClient.destroy();
            }
        });
    
        await _LogClient.login(process.env["TOKEN"]);
    }
})();
