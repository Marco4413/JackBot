const { fetch } = require("cross-fetch");
const Logger = require("./Logger.js");
const Utils = require("./Utils.js");

// This Twitch API implementation follows what's specified at https://dev.twitch.tv/docs/api/get-started
// TODO: Add bulk queries to reduce API calls
const _TWITCH_OAUTH_API_URL = "https://id.twitch.tv/oauth2";
const _TWITCH_API_URL = "https://api.twitch.tv/helix";
const _TWITCH_API_SCOPE = "";
const _TWITCH_URL = "https://www.twitch.tv";

const _CLIENT_ID = Utils.GetEnvVariable("TWITCH_CLIENT_ID", undefined, null, Logger.Warn);
const _CLIENT_SECRET = Utils.GetEnvVariable("TWITCH_CLIENT_SECRET", undefined, null, Logger.Warn);

/** @type {{ authToken: String, authType: String, expiryDate: Number }?} */
let _LastAuth = null;

/** @returns {Promise<String?>} */
const _GetAuthentication = async () => {
    if (_CLIENT_ID == null || _CLIENT_SECRET == null) return null;
    if (_LastAuth == null || Date.now() >= _LastAuth.expiryDate) {
        // curl -X POST 'https://id.twitch.tv/oauth2/token' \
        //     -H 'Content-Type: application/x-www-form-urlencoded' \
        //     -d 'client_id=<your client id goes here>&client_secret=<your client secret goes here>&grant_type=client_credentials'
        let tokenResp = null;
        try {
            tokenResp = await fetch(
                `${_TWITCH_OAUTH_API_URL}/token`, {
                    "method": "POST",
                    "headers": { "Content-Type": "application/x-www-form-urlencoded" },
                    "body": `client_id=${_CLIENT_ID}&client_secret=${_CLIENT_SECRET}&grant_type=client_credentials&scope=${encodeURIComponent(_TWITCH_API_SCOPE)}`
                }
            );
        } catch (error) {
            Logger.QuietError(error);
            Logger.Error("Twitch OAuth Error (POST /token): Failed to acquire API Token.");
            return null;
        }

        if (tokenResp.ok) {
            const { access_token, token_type, expires_in } = await tokenResp.json();
            _LastAuth = {
                "authToken": access_token,
                "authType": Utils.Capitalize(token_type),
                "expiryDate": expires_in + Date.now() - 2e3
            };
        } else {
            Logger.Error(`Twitch OAuth Error (POST /token): ${tokenResp.status} -> ${tokenResp.statusText}`);
            return null;
        }
    }

    return `${_LastAuth.authType} ${_LastAuth.authToken}`;
};

/**
 * @typedef {Object} TwitchStream A Twitch Stream's details
 * @property {String} streamId The id of the Stream
 * @property {String} streamerId The id of the Streamer
 * @property {String} streamerUsername The username of the Streamer
 * @property {String} streamerDisplayName The display name of the Streamer
 * @property {String} streamerUrl The url to the Streamer's channel
 * @property {String} gameId The id of the game the Streamer's playing
 * @property {String} gameName The name of the game the Streamer's playing
 * @property {String} title The title of the Stream
 * @property {Number} viewers The current viewers count
 * @property {Number} startedAt The time at which the Stream started
 * @property {String} language The language the Stream is on
 * @property {String} thumbnailUrl The url to the Stream's thumbnail
 * @property {String[]} tagIds The tags of the Stream
 * @property {Boolean} isMature Whether or not the Stream shows mature content
 * 
 * @typedef {Object} TwitchUser A Twitch User's details
 * @property {String} id The id of the User
 * @property {String} username The username of the User
 * @property {String} displayName The display name of the User
 * @property {String} url The url to the User's channel
 * @property {Boolean} isPartner Whether or not the User's a Twitch Partner
 * @property {Boolean} isAffiliate Whether or not the User's a Twitch Affiliate
 * @property {String} description The User's description
 * @property {String} profileImageUrl The profile picture of the User
 * @property {String} offlineImageUrl The picture shown when the User's not streaming
 * @property {Number} views The total views of the User
 * @property {Number} createdAt The time at which the User's account was created
 */

/**
 * @param {String} userId
 * @param {Boolean} [isUsername]
 * @param {Number} [thumbnailWidth]
 * @param {Number} [thumbnailHeight]
 * @returns {Promise<TwitchStream?>}
 */
const _GetStream = async (userId, isUsername = false, thumbnailWidth = 1024, thumbnailHeight = 576) => {
    // Logger.Debug(`${username} Streams:`);
    const auth = await _GetAuthentication();
    if (auth == null) return null;
    
    const encodedUserId = encodeURIComponent(userId);
    
    // curl -X GET 'https://api.twitch.tv/helix/users?login=twitchdev' \
    //     -H 'Authorization: Bearer jostpf5q0puzmxmkba9iyug38kjtg' \
    //     -H 'Client-Id: wbmytr93xzw8zbg0p1izqyzzc5mbiz'
    const streamsResp = await fetch(
        `${_TWITCH_API_URL}/streams?${isUsername ? "user_login" : "user_id"}=${encodedUserId}`, {
            "method": "GET",
            "headers": {
                "Authorization": auth,
                "Client-Id": _CLIENT_ID
            }
        }
    );

    if (streamsResp.ok) {
        const streams = (await streamsResp.json()).data;
        // Logger.Debug(streams);
        if (streams.length > 0) {
            const stream = streams[0];
            return {
                "streamId": stream.id,
                "streamerId": stream.user_id,
                "streamerUsername": stream.user_login,
                "streamerDisplayName": stream.user_name,
                "streamerUrl": `${_TWITCH_URL}/${encodeURIComponent(stream.user_login)}`,
                "gameId": stream.game_id,
                "gameName": stream.game_name,
                "title": stream.title,
                "viewers": stream.viewer_count,
                "startedAt": Date.parse(stream.started_at),
                "language": stream.language,
                "thumbnailUrl": Utils.MapFormatString(stream.thumbnail_url, {
                    "width": thumbnailWidth, "height": thumbnailHeight
                }),
                "tagIds": stream.tag_ids,
                "isMature": stream.is_mature
            };
        } else return null;
    } else {
        Logger.Error(`Twitch API Error (GET /streams): ${streamsResp.status} -> ${streamsResp.statusText}`);
        return null;
    }
};

/**
 * Gets stream informations about the specified user, returns null if the user isn't streaming
 * @param {String} username The user's Twtich username
 * @param {Number} [thumbnailWidth] The width of the stream's thumbnail
 * @param {Number} [thumbnailHeight] The height of the stream's thumbnail
 * @returns {Promise<TwitchStream?>} The user's Twitch stream if streaming
 */
const GetStreamByUsername = async (username, thumbnailWidth = 1024, thumbnailHeight = 576) => {
    return await _GetStream(username, true, thumbnailWidth, thumbnailHeight);
};

/**
 * Gets stream informations about the specified user, returns null if the user isn't streaming
 * @param {String} userId The user's Twtich id
 * @param {Number} [thumbnailWidth] The width of the stream's thumbnail
 * @param {Number} [thumbnailHeight] The height of the stream's thumbnail
 * @returns {Promise<TwitchStream?>} The user's Twitch stream if streaming
 */
const GetStreamByUserId = async (userId, thumbnailWidth = 1024, thumbnailHeight = 576) => {
    return await _GetStream(userId, false, thumbnailWidth, thumbnailHeight);
};

/**
 * @param {String} userId
 * @param {Boolean} [isUsername]
 * @returns {Promise<TwitchUser?>}
 */
const _GetUser = async (userId, isUsername = false) => {
    const auth = await _GetAuthentication();
    if (auth == null) return null;
    
    const encodedUserId = encodeURIComponent(userId);
    
    // curl -X GET 'https://api.twitch.tv/helix/users?login=twitchdev' \
    //     -H 'Authorization: Bearer jostpf5q0puzmxmkba9iyug38kjtg' \
    //     -H 'Client-Id: wbmytr93xzw8zbg0p1izqyzzc5mbiz'
    const usersResp = await fetch(
        `${_TWITCH_API_URL}/users?${ isUsername ? "login" : "id" }=${encodedUserId}`, {
            "method": "GET",
            "headers": {
                "Authorization": auth,
                "Client-Id": _CLIENT_ID
            }
        }
    );

    if (usersResp.ok) {
        const users = (await usersResp.json()).data;
        if (users.length > 0) {
            const user = users[0];
            // Logger.Debug(user);
            return {
                "id": user.id,
                "username": user.login,
                "displayName": user.display_name,
                "url": `${_TWITCH_URL}/${encodeURIComponent(user.login)}`,
                "isPartner": user.broadcaster_type === "partner",
                "isAffiliate": user.broadcaster_type === "affiliate",
                "description": user.description,
                "profileImageUrl": user.profile_image_url,
                "offlineImageUrl": user.offline_image_url,
                "views": user.view_count,
                "createdAt": Date.parse(user.created_at)
            };
        } else return null;
    } else {
        Logger.Error(`Twitch API Error (GET /users): ${usersResp.status} -> ${usersResp.statusText}`);
        return null;
    }
};

/**
 * Gets user informations of the user with the specified username, returns null if none is found
 * @param {String} username The user's username
 * @returns {Promise<TwitchUser?>} The user's informations if found
 */
const GetUserByUsername = async (username) => {
    return await _GetUser(username, true);
};

/**
 * Gets user informations of the user with the specified id, returns null if none is found
 * @param {String} userId The user's id
 * @returns {Promise<TwitchUser?>} The user's informations if found
 */
const GetUserById = async (userId) => {
    return await _GetUser(userId, false);
};

/**
 * Gets the Twitch url to the user with the specified username (Doesn't fetch the Twitch API)
 * @param {String} username The username of the user to get the url for
 * @returns {String} The url to the user's channel
 */
const GetUserUrlByUsername = username =>
    `${_TWITCH_URL}/${encodeURIComponent(username)}`;

/**
 * Gets the Twitch url to the user with the specified id if one exists (Fetches the Twitch API to get the username)
 * @param {String} userId The id of the user to get the url for
 * @returns {Promise<String?>} The url to the user's channel if it exists
 */
const GetUserUrlById = async (userId) => {
    const user = await GetUserById(userId);
    if (user == null) return null;
    return GetUserUrlByUsername(user.username);
};

module.exports = {
    GetStreamByUsername, GetStreamByUserId,
    GetUserByUsername, GetUserById,
    GetUserUrlByUsername, GetUserUrlById
};
