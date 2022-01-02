# The Data Folder

The data folder contains stuff that is specific to the computer hosting the bot,
such as logs, custom sounds, SQLite database...

The folders that should be present upon first start of the bot are the following:
 - [`logs/`](#logs-folder) : Folder which holds all logs.
 - [`sounds/`](#sounds-folder) : Folder which holde all custom sounds.

## Logs Folder

This folder contains all logs created by the bot separated into directories which
are named after the day the log was saved.

**Example:**

The log saved at `logs/2022-01-02/2022-01-02T10-42-23_706.log.txt` was created
on `The Second of January 2022` at the time `10:42:23.706`.

## Sounds Folder

This folder contains all custom sounds which the bot can play and a `config.json`
file which holds the following info:

```json
{
  "altsRoot": "path-to-sound-alts-relative-to-this-file",
  "sounds": {
    "<SOUND_NAME_TO_CONFIGURE>": {
      "altChance": 0.5,
      "altsFolder": "path-to-sound-relative-to-altsRoot"
    }
  }
}
```

The name of the sounds is their name lower-cased with no extra whitespaces.

**NOTE:** All Sounds must be either `mp3` or `wav`, other formats are not officially
supported but can be added to the `_AUDIO_EXTENSIONS` array defined at the top
of the file in [`commands/Sound.js`](../commands/Sound.js), be sure that they can be
converted by `FFMpeg`.
