const _NODE_ENV = process.env["NODE_ENV"] ?? "production";

const NodeEnv = {
    "PRODUCTION": false,
    "DEVELOPMENT": false
};

for (const env of _NODE_ENV.split(";")) {
    /** @type {keyof NodeEnv} */
    const nodeEnvKey = env.toUpperCase();
    if (NodeEnv[nodeEnvKey] !== undefined)
        NodeEnv[nodeEnvKey] = true;
}

module.exports = NodeEnv;
