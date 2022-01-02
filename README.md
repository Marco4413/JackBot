# JackBot

## Steps to run this project:

 1. Create a `.env` file on the project's root and add the following template:
```env
# Your Bot Token Goes Here
TOKEN = "MyBotToken"

# Client Settings
# The Update Interval used by the Client to check Voice Channel State when playing Audio
#  This must be less than the Number specified in CLIENT_PLAYER_IDLE_TIME
CLIENT_PLAYER_UPDATE_INTERVAL = 10e3
# The Time to wait to Destroy the Voice Connection after it Starts Idling
CLIENT_PLAYER_IDLE_TIME = 60e3

# The Save Interval between Log Saves
LOGGER_SAVE_INTERVAL = 3600e3

# The Default Locale for the Bot ( This field is not required )
DEFAULT_LOCALE = "en-us"

# Rich Presence Settings
# RP Update Interval in Milliseconds
RP_UPDATE_INTERVAL = 3600e3

# Database Settings
DB_MODE = "sqlite"

# SQLite Settings for "sqlite" mode
SQLITE_STORAGE = "./data/database.sqlite"

# MariaDB Settings for "mariadb" mode
MARIADB_HOST = "192.168.1.100"
MARIADB_PORT = 3306
MARIADB_DATABASE = "JackBot"
MARIADB_USERNAME = "jack"
MARIADB_PASSWORD = "jack-is-cool"
```
 2. Run `npm i` to install all dependencies
 3. Run `npm run start` to run the project

**NOTE:** This Project uses Node v16.13.0

## Contributing

This project uses EditorConfig, so if you're using VSCode you should download
the EditorConfig extension specified in the Official Site: [https://editorconfig.org](https://editorconfig.org)

It also uses ESLint, extensions can be found at the following link: [https://eslint.org/docs/user-guide/integrations](https://eslint.org/docs/user-guide/integrations)<br>
The ESLint module is a dev dependency of this project.
