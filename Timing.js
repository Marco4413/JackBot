
const _Intervals = { };

// TODO: Add Timeouts again if they'll ever be needed

/** @typedef {(id: NodeJS.Timer, signal: String?) => Void)} TimerHandler */

/**
 * Creates a new Interval which will be automatically cleared on Interrupt
 * @param {TimerHandler} handler The Interval handler, if it returns true then the Interval will be Cleared
 * @param {Number} timeout The time in milliseconds between calls to handler
 * @param {"use-handler"|TimerHandler} [clearHandler] The handler to call on Clear
 * @param {"use-handler"|TimerHandler} [createHandler] The handler to call on Create
 * @returns {NodeJS.Timer} The id of the created Interval
 */
const CreateInterval = (handler, timeout, clearHandler, createHandler) => {
    if (clearHandler  === "use-handler") clearHandler  = handler;
    if (createHandler === "use-handler") createHandler = handler;

    let intervalId;
    const wHandler = () => handler(intervalId, null);

    intervalId = setInterval(wHandler, timeout);
    _Intervals[intervalId] = { clearHandler, "handler": wHandler };

    if (createHandler !== undefined) createHandler(intervalId, null);

    return intervalId;
};

/**
 * Clears the specified Interval
 * @param {NodeJS.Timer} intervalId The Interval to Clear
 * @param {String?} signal The Signal to send to the Clear Handler
 */
const ClearInterval = (intervalId, signal = null) => {
    clearInterval(intervalId);
    const interval = _Intervals[intervalId];
    if (interval !== undefined && interval.clearHandler !== undefined)
        interval.clearHandler(intervalId, signal);
    _Intervals[intervalId] = undefined;
};

const _ClearAllIntervals = (signal = null) => {
    for (const intervalId of Object.keys(_Intervals)) {
        ClearInterval(intervalId, signal);
    }
};

process.once("SIGINT", () => _ClearAllIntervals("SIGINT"));

module.exports = {
    CreateInterval, ClearInterval
};
