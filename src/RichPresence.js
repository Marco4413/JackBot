const { Client } = require("./Client.js");
const { CreateInterval } = require("./Timing.js");
const { GetLocale } = require("./Localization.js");
const Utils = require("./Utils.js");
const Logger = require("./Logger.js");
const { ActivityType } = require("discord.js");

const _RP_DEFAULT_UPDATE_INTERVAL = 3600e3;

const _VALID_ACTIVITY_TYPES = {
    "COMPETING": ActivityType.Competing,
    "LISTENING": ActivityType.Listening,
    "PLAYING": ActivityType.Playing,
    "STREAMING": ActivityType.Streaming,
    "WATCHING": ActivityType.Watching
};

const StartRichPresence = async () => {
    const updateInterval = Utils.GetEnvVariable("RP_UPDATE_INTERVAL", Utils.AnyToNumber, _RP_DEFAULT_UPDATE_INTERVAL, Logger.Warn);

    const activityOptions = GetLocale().GetCommon("richPresence");
    if (typeof activityOptions !== "string") {
        Logger.Warn("Rich Presence Failed to Run: DefaultLocale.common.richPresence is not a String.");
    } else {
        /** @type {[ String, String ]} */
        let [ activityName, ...activityWords ] = activityOptions.trim().split(" ");
        activityName = activityName.toUpperCase();

        if (_VALID_ACTIVITY_TYPES[activityName] != null) {
            const activityName = Utils.JoinArray(activityWords, " ");
            CreateInterval(async () => {
                let totalMembers = 0;
                let onlineMembers = 0;
                for (const guild of Client.guilds.cache.values()) {
                    const members = await guild.members.fetch();
                    for (const member of members.values()) {
                        if (member.user.bot) continue;
                        totalMembers++;
        
                        if (
                            member.presence != null &&
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
                    "type": _VALID_ACTIVITY_TYPES[activityName]
                });
            }, updateInterval, undefined, "use-handler");
        } else {
            Logger.Warn(
                `Rich Presence Failed to Run: DefaultLocale.common.richPresence has invalid activity type: ${
                    activityName
                }. Valid Types are [ ${
                    Utils.JoinArray(Object.keys(_VALID_ACTIVITY_TYPES), ", ")
                } ]`
            );
        }
    }

};

module.exports = { StartRichPresence };
