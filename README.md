# JackBot

## Steps to run this project:

 1. Create a `.env` file on the project's root and add the following template:
```env
# Your Bot Token Goes Here
TOKEN = "MyBotToken"

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
 3. Run `node .` to run the project

**NOTE:** This Project uses Node v16.13.0

## Contributing

This project uses EditorConfig, so if you're using VSCode you should download
the EditorConfig extension specified in the Official Site: [https://editorconfig.org](https://editorconfig.org)

It also uses ESLint, extensions can be found at the following link: [https://eslint.org/docs/user-guide/integrations](https://eslint.org/docs/user-guide/integrations)<br>
The ESLint module is a dev dependency of this project.
