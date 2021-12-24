
const _Timeouts = { };
const _Intervals = { };

/**
 * Creates a new Timeout which will be automatically cleared on Interrupt
 * @param {(args: ...Any) => Promise<void>|undefined)} handler The Timeout handler
 * @param {Number} timeout The time in milliseconds elapsed for handler to be called
 * @param {Boolean} [callOnClear] Whether or not to call the handler on {@link ClearTimeout}
 * @param {...Any} args The arguments for handler
 * @returns {NodeJS.Timeout} The id of the created Timeout
 */
const CreateTimeout = (handler, timeout, callOnClear = false, ...args) => {
    const wHandler = async () => {
        await handler(...args);
        _Timeouts[timeoutId] = undefined;
    };

    const timeoutId = setTimeout(wHandler, timeout);
    _Timeouts[timeoutId] = { callOnClear, "handler": wHandler };
    return timeoutId;
};

/**
 * Clears the specified Timeout
 * @param {NodeJS.Timeout} timeoutId The Timeout to Clear
 */
const ClearTimeout = async (timeoutId) => {
    clearTimeout(timeoutId);
    if (_Timeouts[timeoutId] !== undefined && _Timeouts[timeoutId].callOnClear)
        await _Timeouts[timeoutId].handler();
    _Timeouts[timeoutId] = undefined;
};

/**
 * Creates a new Interval which will be automatically cleared on Interrupt
 * @param {(args: ...Any) => Promise<Boolean>|Boolean)} handler The Interval handler, if it returns true then the Interval will be Cleared
 * @param {Number} timeout The time in milliseconds between calls to handler
 * @param {Boolean} [callOnClear] Whether or not to call the handler on {@link ClearInterval}
 * @param {Boolean} [callOnCreate] Whether or not to call the handler at Creation
 * @param  {...Any} args The arguments for handler
 * @returns {NodeJS.Timer} The id of the created Interval
 */
const CreateInterval = async (handler, timeout, callOnClear = false, callOnCreate = false, ...args) => {
    const wHandler = async () => {
        if (await handler(...args)) {
            clearInterval(intervalId);
            _Intervals[intervalId] = undefined;
        }
    };

    const intervalId = setInterval(wHandler, timeout);
    _Intervals[intervalId] = { callOnClear, "handler": wHandler };

    if (callOnCreate) await wHandler();

    return intervalId;
};

/**
 * Clears the specified Interval
 * @param {NodeJS.Timer} intervalId The Interval to Clear
 */
const ClearInterval = async (intervalId) => {
    clearInterval(intervalId);
    if (_Intervals[intervalId] !== undefined && _Intervals[intervalId].callOnClear)
        await _Intervals[intervalId].handler();
    _Intervals[intervalId] = undefined;
};

process.once("SIGINT", async () => {
    for (const timeoutId of Object.keys(_Timeouts)) {
        await ClearTimeout(timeoutId);
    }

    for (const intervalId of Object.keys(_Intervals)) {
        await ClearInterval(intervalId);
    }
});

module.exports = {
    CreateTimeout, ClearTimeout,
    CreateInterval, ClearInterval
};
