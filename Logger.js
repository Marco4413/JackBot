const chalk = require("chalk");
const { JoinArray } = require("./Utils.js");

const _ENABLE_DEBUG_LOG = process.env["NODE_ENV"] === "development";

const _GROUP_INDENT_SIZE = 2;

const _Times = { };

let _GroupIndentTotal = 0;
/** @returns {String} The Logged String */
const _ConsoleLog = (...data) => {
    const indentStr = " ".repeat(_GroupIndentTotal);
    const logString = indentStr + JoinArray(data, " ").replace(/\n/g, "\n" + indentStr);
    console.log(logString);
    return logString;
};

/**
 * @param {chalk.Chalk} chalk
 * @param {String} prefix
 * @param {...Any} message
 */
const _InternalLog = (chalk, prefix, ...message) => {
    // TODO: At some point this will have to save the logs
    const date = new Date().toISOString();
    _ConsoleLog(chalk(`[ ${date} ][ ${prefix} ]`) + ":", ...message);
};

const _LogChalk    = chalk.bold.green;
const _InfoChalk   = chalk.bold.green;
const _DebugChalk  = chalk.bold.green;
const _AssertChalk = chalk.bold.redBright;
const _ErrorChalk  = chalk.bold.redBright;
const _WarnChalk   = chalk.bold.yellow;

const _TraceChalk  = chalk.bold.green;
const _GroupChalk  = chalk.bold.rgb(255, 150, 0);
const _TimeChalk   = chalk.bold.blue;

/** Logs the specified Message */
const Log      = (...message) => _InternalLog(_LogChalk  , "LOG", ...message);
/** Logs the specified Info Message */
const Info     = (...message) => _InternalLog(_InfoChalk , "INFO", ...message);
/** Logs the specified Debug Message */
const Debug    = (...message) => { if (_ENABLE_DEBUG_LOG) _InternalLog(_DebugChalk, "DEBUG", ...message); };
/**
 * Logs the specified Message if the specified condition is true
 * @param {Boolean} condition
 */
const Assert   = (condition, ...message) => { if (!condition) _InternalLog(_AssertChalk, "ASSERT", ...message); };
/** Logs the specified Error Message */
const LogError = (...message) => _InternalLog(_ErrorChalk, "ERROR", ...message);
/** Logs the specified Warning Message */
const Warn     = (...message) => _InternalLog(_WarnChalk , "WARN", ...message);

/** Logs a Traceback preceded by the specified Message */
const Trace = (...data) => {
    const err = new Error(JoinArray(data, " "));
    err.name = "";
    _InternalLog(_TraceChalk, "TRACE", err.stack);
};

/** Starts a Group with the specified Name */
const GroupStart = (...data) => {
    _ConsoleLog(_GroupChalk(JoinArray(data, " ")));
    _GroupIndentTotal += _GROUP_INDENT_SIZE;
};

/** Ends the current Group */
const GroupEnd = (...data) => {
    _GroupIndentTotal = Math.max(_GroupIndentTotal - _GROUP_INDENT_SIZE, 0);
    if (data.length > 0) _ConsoleLog(_GroupChalk(JoinArray(data, " ")));
};

/** Starts to keep track of the time for the specified label */
const TimeStart = (label) => {
    _Times[label] = Date.now();
};

/** Logs the current delta time for the specified label */
const TimeLog = (label) => {
    const currentTime = Date.now();
    const deltaTime = _Times[label] === undefined ? "undefined" : `${currentTime - _Times[label]}ms`;
    _InternalLog(_TimeChalk, `TIME/${label}`, deltaTime);
};

/** Logs the current delta time for the specified label and removes it */
const TimeEnd = (label) => {
    TimeLog(label);
    _Times[label] = undefined;
};

module.exports = {
    Log, Info, Debug, Assert, "Error": LogError, Warn,
    Trace, GroupStart, GroupEnd, TimeStart, TimeLog, TimeEnd
};
