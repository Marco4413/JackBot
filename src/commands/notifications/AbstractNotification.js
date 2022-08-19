/**
 * @template {Any} T
 * @typedef {(userId: String) => Promise<T?>} NotificationSubscribe
 * Starts listening to Notifications of the specified user
 */

/**
 * @typedef {() => Promise<Void>} NotificationSyncToDatabase
 * Syncs to the Database by Subscribing to all saved Notifications
 * @typedef {(userId: String) => Promise<Void>} NotificationUnsubscribe
 * Stops listening for Notifications of the specified user
 * @typedef {() => Promise<Void>} NotificationNotify
 * Checks all Notifications and sends them if necessary
 * @typedef {(userId: String) => Promise<String>} NotificationGetSocialUrl
 * Returns the specified user's Social Url
 */

/**
 * @typedef {Object} NotificationExports
 * @property {NotificationSyncToDatabase} SyncToDatabase
 * @property {NotificationSubscribe} Subscribe
 * @property {NotificationUnsubscribe} Unsubscribe
 * @property {NotificationNotify} Notify
 * @property {NotificationGetSocialUrl} GetSocialUrl
 */

module.exports = { };
