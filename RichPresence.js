const { Client } = require("./Client.js");
const { CreateInterval } = require("./Timing.js");
const { GetLocale } = require("./Localization.js");
const Utils = require("./Utils.js");
const Logger = require("./Logger.js");

const _RP_DEFAULT_UPDATE_INTERVAL = 3600e3;

/** @type {import("discord.js").ActivityType[]} */
const _VALID_ACTIVITY_TYPES = [
    "COMPETING", "LISTENING", "PLAYING",
    "STREAMING", "WATCHING"
];

/**
 * @param {String} activityType
 * @returns {Boolean}
 */
const _IsValidActivityType = (activityType) => {
    return _VALID_ACTIVITY_TYPES.findIndex(v => activityType === v) >= 0;
};

const StartRichPresence = async () => {
    const updateInterval = Utils.GetEnvVariable("RP_UPDATE_INTERVAL", Utils.AnyToNumber, _RP_DEFAULT_UPDATE_INTERVAL, Logger.Warn);

    const activityOptions = GetLocale().GetCommon("richPresence");
    if (typeof activityOptions !== "string") {
        Logger.Warn("Rich Presence Failed to Run: DefaultLocale.common.richPresence is not a String.");
    } else {
        /** @type {[ import("discord.js").ActivityType, String ]} */
        let [ activityType, ...activityWords ] = activityOptions.trim().split(" ");
        activityType = activityType.toUpperCase();

        const activityName = Utils.JoinArray(activityWords, " ");
        if (_IsValidActivityType(activityType)) {
            CreateInterval(async () => {
                let totalMembers = 0;
                let onlineMembers = 0;
                for (const guild of Client.guilds.cache.values()) {
                    const members = await guild.members.fetch();
                    for (const member of members.values()) {
                        if (member.user.bot) continue;
                        totalMembers++;
        
                        if (
                            member.presence !== null &&
                            member.presence.status !== "offline" && member.presence.status !== "invisible"
                        ) onlineMembers++;
                    }
                }
        
                Client.user.setActivity({
                    "name": Utils.MapFormatString(activityName, {
                        "online-users": onlineMembers,
                        "total-users": totalMembers,
                        "total-guilds": Client.guilds.cache.size
                    }),
                    "type": activityType
                });
            }, updateInterval, undefined, "use-handler");
        } else {
            Logger.Warn(
                `Rich Presence Failed to Run: DefaultLocale.common.richPresence has invalid activity type: ${
                    activityType
                }. Valid Types are [ ${
                    Utils.JoinArray(_VALID_ACTIVITY_TYPES, ", ")
                } ]`
            );
        }
    }

};

module.exports = { StartRichPresence };
