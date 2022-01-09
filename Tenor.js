const Fetch = require("node-fetch");
const Logger = require("./Logger.js");
const Utils = require("./Utils.js");

// These typedefs should follow these guidelines https://tenor.com/gifapi/documentation

/**
 * @typedef {Object} TenorBaseFormat
 * @property {String} preview An url to a preview image of the media source
 * @property {String} url An url to the media source
 * @property {[ Number, Number ]} dims Width and height in pixels
 * @property {Number} size Size of file in bytes
 */

/**
 * @typedef {Object} _TenorMP4BaseFormatType
 * @property {Number} duration Duration of file
 * @typedef {TenorBaseFormat&_TenorMP4BaseFormatType} TenorMP4BaseFormat
 */

/**
 * @typedef {Object} TenorMinimalMedia
 * @property {TenorBaseFormat} gif Use this size for GIF shares on desktop
 * @property {TenorBaseFormat} tinygif Use this size for GIF previews and shares on mobile
 * @property {TenorMP4BaseFormat} mp4 Use this size for MP4 previews and shares on desktop
 */

/**
 * @typedef {Object} _TenorBasicMediaType
 * @property {TenorBaseFormat} nanogif Use this size for GIF previews on mobile
 * @property {TenorMP4BaseFormat} tinymp4 Use this size for mp4 previews and shares on mobile
 * @property {TenorMP4BaseFormat} nanomp4 Use this size for mp4 previews on mobile
 * @typedef {TenorMinimalMedia&_TenorBasicMediaType} TenorBasicMedia
 */

/**
 * @typedef {Object} _TenorDefaultMediaType
 * @property {TenorBaseFormat} mediumgif Use this size for GIF previews on desktop
 * @property {TenorMP4BaseFormat} loopedmp4 Use this size for mp4 shares if you want the video clip to run a few times rather than only once
 * @property {TenorBaseFormat} webm Use this size for webm previews and shares on desktop
 * @property {TenorBaseFormat} tinywebm Use this size for GIF shares on mobile
 * @property {TenorBaseFormat} nanowebm Use this size for GIF previews on mobile
 * @typedef {TenorBasicMedia&_TenorDefaultMediaType} TenorDefaultMedia
 */

/**
 * @typedef {Object} TenorMediaTypes
 * @property {TenorDefaultMedia} default All types
 * @property {TenorBasicMedia} basic nanomp4, tinygif, tinymp4, gif, mp4, and nanogif
 * @property {TenorMinimalMedia} minimal tinygif, gif, and mp4
 */

/**
 * @template {keyof TenorMediaTypes} T
 * @typedef {Object} TenorResult
 * @property {String} id Tenor result identifier
 * @property {String} title The title of the post
 * @property {String} content_description The description of the post
 * @property {String[]} tags An array of tags for the post
 * @property {Number} created An unix timestamp representing when this post was created
 * @property {String} itemurl The full URL to view the post on tenor.com
 * @property {String} url A short URL to view the post on tenor.com
 * @property {[ TenorMediaTypes[T] ]} media An array of dictionaries with the format name as the key and format object as the value
 * @property {Boolean} hasaudio True if this post contains audio (only video formats support audio, the gif image file format cannot contain audio information)
 * @property {Boolean} hascaption True if this post contains captions
 */

const _TENOR_API_KEY = Utils.GetEnvVariable("TENOR_API_KEY", undefined, null, Logger.Warn);

/**
 * Checks if Tenor Searches can be done
 * @returns {Boolean} Whether or not Tenor Searches can be done
 */
const CanTenorSearch = () => _TENOR_API_KEY !== null;

/**
 * Searches for query on Tenor
 * @template {keyof TenorMediaTypes} T
 * @param {String} query What to query Tenor with
 * @param {Number} [limit] The max amount of gifs returned
 * @param {"search"|"random"} [searchType] The type of gif search
 * @param {"off"|"low"|"medium"|"high"} [contentFilter] The content filter for the search
 * @param {T} [mediaFilter] The media filter specifies what formats are returned
 * @param {Number} [pos] The offset in the gif list
 * @returns {TenorResult<T>[]} The result of the Tenor Search
 */
const TenorSearch = async (query, limit = 50, searchType = "search", contentFilter = "medium", mediaFilter = "default", pos = 0) => {
    if (!CanTenorSearch()) return [ ];
    const queryURL = `https://g.tenor.com/v1/${searchType}?q=${encodeURI(query)}&key=${encodeURI(_TENOR_API_KEY)}&limit=${limit}&contentfilter=${contentFilter}&media_filter=${mediaFilter}&pos=${pos}`;
    const response = await Fetch(queryURL, { "method": "GET" });
    return response.ok ? (await response.json()).results : [ ];
};

module.exports = { TenorSearch, CanTenorSearch };
