const { Client } = require("./Client.js");
const { CreateInterval, CreateTimeout } = require("./Timing.js");

const _RP_DEFAULT_UPDATE_INTERVAL = 3600e3;

const StartRichPresence = async () => {
    let updateInterval = Number(process.env["RP_UPDATE_INTERVAL"]);
    if (Number.isNaN(updateInterval)) {
        updateInterval = _RP_DEFAULT_UPDATE_INTERVAL;
        console.warn(`Rich Presence Update Interval in Process Environment is NaN, using the default value: ${_RP_DEFAULT_UPDATE_INTERVAL}ms`);
    }

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
            "name": `${onlineMembers}/${totalMembers} Users in ${Client.guilds.cache.size} Guilds.`,
            "type": "WATCHING"
        });
    }, updateInterval, false, true);
};

module.exports = { StartRichPresence };
