const fs = require("fs");
const chalk = require("chalk");
const { CreateInterval } = require("./Timing.js");
const { JoinArray, GetFormattedDateComponents } = require("./Utils.js");

const _DEFAULT_LOGGER_SAVE_INTERVAL = 1800e3;
const _ENABLE_DEBUG_LOG = process.env["NODE_ENV"] === "development";
const _INDENT_TEXT = " ";
const _GROUP_INDENT_SIZE = 2;

const _Times = { };
let _LoggedLines = [ ];
let _GroupIndentTotal = 0;

/**
 * @param {chalk.Chalk} chalk
 * @param {String} prefix
 * @param {...Any} message
 */
const _SimpleLog = (chalk, prefix, ...message) => {
    _ExtendedLog(chalk, prefix, false, true, ...message);
};

/**
 * @param {chalk.Chalk} chalk
 * @param {String} prefix
 * @param {Boolean} chalkAll
 * @param {Boolean} prefixColon
 * @param {...Any} message
 */
const _ExtendedLog = (chalk, prefix, chalkAll, prefixColon, ...message) => {
    const logDate = GetFormattedDateComponents();
    const indentStr = _INDENT_TEXT.repeat(_GroupIndentTotal);
    const fullPrefix = `[ ${logDate.date} ${logDate.time} ][ ${prefix} ]`;
    const logMessage = JoinArray(message, " ").replace(/\n/g, "\n" + indentStr);


    const colon = ( prefixColon ? ":" : "" ) + ( message.length > 0 ? " " : "" );
    const loggedLine = indentStr + fullPrefix + colon + logMessage;
    _LoggedLines.push(loggedLine);

    if (chalkAll)
        console.log(chalk(loggedLine));
    else console.log(indentStr + chalk(fullPrefix + colon) + logMessage);
};

// #region Chalks

const _LogChalk    = chalk.bold.green;
const _InfoChalk   = chalk.bold.green;
const _DebugChalk  = chalk.bold.green;
const _AssertChalk = chalk.bold.redBright;
const _ErrorChalk  = chalk.bold.redBright;
const _WarnChalk   = chalk.bold.yellow;

const _TraceChalk  = chalk.bold.green;
const _GroupChalk  = chalk.bold.rgb(255, 150, 0);
const _TimeChalk   = chalk.bold.blue;

// #endregion

// #region Implementing Common Methods from the console Object

/** Logs the specified Message */
const Log      = (...message) => _SimpleLog(_LogChalk  , "LOG", ...message);
/** Logs the specified Info Message */
const Info     = (...message) => _SimpleLog(_InfoChalk , "INFO", ...message);
/** Logs the specified Debug Message */
const Debug    = (...message) => { if (_ENABLE_DEBUG_LOG) _SimpleLog(_DebugChalk, "DEBUG", ...message); };
/**
 * Logs the specified Message if the specified condition is true
 * @param {Boolean} condition
 */
const Assert   = (condition, ...message) => { if (!condition) _SimpleLog(_AssertChalk, "ASSERT", ...message); };
/** Logs the specified Error Message */
const LogError = (...message) => _SimpleLog(_ErrorChalk, "ERROR", ...message);
/** Logs the specified Warning Message */
const Warn     = (...message) => _SimpleLog(_WarnChalk , "WARN", ...message);

/** Logs a Traceback preceded by the specified Message */
const Trace = (...data) => {
    const err = new Error(JoinArray(data, " "));
    err.name = "";
    _SimpleLog(_TraceChalk, "TRACE", err.stack);
};

/** Starts a Group with the specified Name */
const GroupStart = (...data) => {
    _ExtendedLog(_GroupChalk, "GROUP-START", true, false, ...data);
    _GroupIndentTotal += _GROUP_INDENT_SIZE;
};

/** Ends the current Group */
const GroupEnd = (...data) => {
    _GroupIndentTotal = Math.max(_GroupIndentTotal - _GROUP_INDENT_SIZE, 0);
    if (data.length > 0) _ExtendedLog(_GroupChalk, "GROUP_END", true, false, ...data);
};

/** Starts to keep track of the time for the specified label */
const TimeStart = (label) => {
    _Times[label] = Date.now();
};

/** Logs the current delta time for the specified label */
const TimeLog = (label) => {
    const currentTime = Date.now();
    const deltaTime = _Times[label] === undefined ? "undefined" : `${currentTime - _Times[label]}ms`;
    _ExtendedLog(_TimeChalk, "TIME", true, false, label + ":", deltaTime);
};

/** Logs the current delta time for the specified label and removes it */
const TimeEnd = (label) => {
    TimeLog(label);
    _Times[label] = undefined;
};

// #endregion

const _SaveLog = () => {
    if (_LoggedLines.length === 0) return;
    Info("Saving Log...");

    const logData = JoinArray(_LoggedLines, "\n");
    _LoggedLines = [ ];

    const logDate = GetFormattedDateComponents(undefined, "-", "-", "_");
    const logDir = "./data/logs/" + logDate.date;

    fs.mkdirSync(logDir, { "recursive": true });
    fs.writeFileSync(`${logDir}/${logDate.date}T${logDate.time}.log.txt`, logData, { "flag": "w" });
};

CreateInterval(_SaveLog, (() => {
    let saveInterval = Number(process.env["LOGGER_SAVE_INTERVAL"]);
    if (Number.isNaN(saveInterval)) {
        saveInterval = _DEFAULT_LOGGER_SAVE_INTERVAL;
        Warn(`Logger Save Interval in Process Environment is NaN, using the default value: ${_DEFAULT_LOGGER_SAVE_INTERVAL}ms`);
    }
    return saveInterval;
})(), true, false);

module.exports = {
    Log, Info, Debug, Assert, "Error": LogError, Warn,
    Trace, GroupStart, GroupEnd, TimeStart, TimeLog, TimeEnd
};
