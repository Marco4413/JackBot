const chalk = require("chalk");
const { CreateInterval } = require("./Timing.js");
const { JoinArray } = require("./Utils.js");
const { DEVELOPMENT } = require("./NodeEnv.js");

const { Worker } = require("worker_threads");
const _LoggerWorker = new Worker("./LoggerWorker.js");

const _DEFAULT_LOGGER_SAVE_INTERVAL = 3600e3;
const _GROUP_INDENT_SIZE = 2;
const _Times = { };

/**
 * @param {chalk.Chalk} chalk
 * @param {String} prefix
 * @param {Any[]} message
 * @param {Boolean} [chalkAll]
 * @param {Boolean} [prefixColon]
 */
const _ConsoleLog = (chalk, prefix, message = [ ], chalkAll = false, prefixColon = true) => {
    _LoggerWorker.postMessage({
        "type": "message",
        "chalk": chalk("{0}"),
        "chalkAll": chalkAll,
        "prefix": prefix,
        "prefixColon": prefixColon,
        // Joining Array Here to make sure that it's Cloneable
        "message": JoinArray(message, " ")
    });
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
const Log      = (...message) => _ConsoleLog(_LogChalk  , "LOG", message);
/** Logs the specified Info Message */
const Info     = (...message) => _ConsoleLog(_InfoChalk , "INFO", message);
/** Logs the specified Debug Message */
const Debug    = (...message) => { if (DEVELOPMENT) _ConsoleLog(_DebugChalk, "DEBUG", message); };
/**
 * Logs the specified Message if the specified condition is true
 * @param {Boolean} condition
 */
const Assert   = (condition, ...message) => { if (!condition) _ConsoleLog(_AssertChalk, "ASSERT", message); };
/** Logs the specified Error Message */
const LogError = (...message) => _ConsoleLog(_ErrorChalk, "ERROR", message);
/** Logs the specified Warning Message */
const Warn     = (...message) => _ConsoleLog(_WarnChalk , "WARN", message);

/** Logs a Traceback preceded by the specified Message */
const Trace = (...data) => {
    const err = new Error(JoinArray(data, " "));
    err.name = "";
    _ConsoleLog(_TraceChalk, "TRACE", [ err.stack ]);
};

/** Starts a Group with the specified Name */
const GroupStart = (...data) => {
    _ConsoleLog(_GroupChalk, "GROUP-START", data, true, false);
    _LoggerWorker.postMessage({
        "type": "indent-change", "indentDelta": _GROUP_INDENT_SIZE
    });
};

/** Ends the current Group */
const GroupEnd = (...data) => {
    _LoggerWorker.postMessage({
        "type": "indent-change", "indentDelta": -_GROUP_INDENT_SIZE
    });
    if (data.length > 0) _ConsoleLog(_GroupChalk, "GROUP_END", data, true, false);
};

/** Starts to keep track of the time for the specified label */
const TimeStart = (label) => {
    _Times[label] = Date.now();
};

/** Logs the current delta time for the specified label */
const TimeLog = (label) => {
    const currentTime = Date.now();
    const deltaTime = _Times[label] === undefined ? "undefined" : `${currentTime - _Times[label]}ms`;
    _ConsoleLog(_TimeChalk, "TIME", [ label + ":", deltaTime ], true, false);
};

/** Logs the current delta time for the specified label and removes it */
const TimeEnd = (label) => {
    TimeLog(label);
    _Times[label] = undefined;
};

// #endregion

CreateInterval(
    (id, signal) => {
        Info("Saving Log...");
        _LoggerWorker.postMessage({
            "type": signal === null ? "save" : "close"
        });
    },
    (() => {
        let saveInterval = Number(process.env["LOGGER_SAVE_INTERVAL"]);
        if (Number.isNaN(saveInterval)) {
            saveInterval = _DEFAULT_LOGGER_SAVE_INTERVAL;
            Warn(`Logger Save Interval in Process Environment is NaN, using the default value: ${_DEFAULT_LOGGER_SAVE_INTERVAL}ms`);
        }
        return saveInterval;
    })(), "use-handler"
);

module.exports = {
    Log, Info, Debug, Assert, "Error": LogError, Warn,
    Trace, GroupStart, GroupEnd, TimeStart, TimeLog, TimeEnd
};
