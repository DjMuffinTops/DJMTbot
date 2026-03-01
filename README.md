# DJMTbot
A bot running Discord.js w/ Typescript, designed for the Pokemon Workshop Discord Server

## Install Node.js
To use discord.js, you'll need to [install Node.js here](https://nodejs.org)

## Install pnpm (recommended)
If you use Corepack (bundled with recent Node releases) enable it and prepare pnpm:
```powershell
corepack enable pnpm
```
Or install pnpm globally:
```powershell
npm install -g pnpm
```

## Install Dependencies
```
pnpm install
```

## Get a Discord Bot Token 
To get your own bot token, [create a bot!](https://discordjs.guide/preparations/setting-up-a-bot-application.html#setting-up-a-bot-application)

You may also ask me for access to the PW Test server and dev bot token on Discord!

## Create a .env file in the root directory
Create a `.env` file in the root directory. You can use `.env.example` as a template:
```bash
cp .env.example .env
```

Then fill in the following environment variables:

## Environment Variables

| Environment Variable | Description | Example Value |
|---------------------|-------------|---------------|
| `TOKEN` | **Required.** Your Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications) | `TOKEN=YOUR_TOKEN_HERE` |
| `APPLICATION_ID` | **Required.** Your Discord bot application ID | `APPLICATION_ID=123456789012345678` |
| `LOG_LEVEL` | Log verbosity level. Options: `error`, `warn`, `info`, `debug`. Default: `info` | `LOG_LEVEL=debug` |
| `PRETTY_LOGS` | Controls console log formatting. Set to `true` for pretty-printed metadata (indented multiline JSON). Default: inline compact JSON format | `PRETTY_LOGS=true` |
| `GUILD_IDS` | Optional comma-separated or JSON array of guild IDs to restrict which guilds the bot creates instances for. If not set, the bot loads all guilds. | `GUILD_IDS=123,456,789` or `GUILD_IDS="[\"123\",\"456\",\"789\"]"` |

**Example `.env` file:**
```env
TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
APPLICATION_ID=YOUR_APPLICATION_ID_HERE
LOG_LEVEL=info
PRETTY_LOGS=true
```

**⚠️ SECURITY WARNING:** DO NOT COMMIT YOUR `.env` FILE TO GIT!  
If you accidentally expose your token publicly, RESET THE TOKEN through the Discord Developer Portal immediately!

### Logging
Logs are automatically written to the `logs/` directory:
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/combined-YYYY-MM-DD.log` - All logs

Log files rotate daily and are retained for 14 days (max 20MB per file).

## Start the Bot
```
pnpm start
```

## Music Bot Features

DJMTbot includes a full-featured music player powered by [DistTube](https://distube.js.org/):

### Available Commands
- `/play <query>` - Play a song from URL or search query
- `/playfile <attachment>` - Play an audio file attachment (mp3, wav, ogg, flac, m4a, webm)
- `/skip` - Skip the current song
- `/stop` - Stop playing and clear the queue
- `/pause` / `/resume` - Control playback
- `/queue` - View the current queue
- `/nowplaying` - Show current song information
- `/volume <0-100>` - Set playback volume
- `/loop <off/song/queue>` - Set loop mode
- `/autoplay` - Toggle autoplay mode

### Supported Sources
With the integrated plugins, the bot can play music from:
- **Direct Links** - Direct audio file URLs (mp3, wav, ogg, etc.)
- **Local Files** - Audio files uploaded to Discord

### Requirements
- FFmpeg (automatically included in Docker container)
- Bot must be in a voice channel to play music
- Users must be in a voice channel to use music commands

## Docker Deployment

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually included with Docker Desktop)

### Quick Start with Docker

1. **Create your `.env` file** (see Environment Variables section above)

2. **Build and run with Docker Compose:**
   ```bash
    pnpm run docker:up
   ```

3. **View logs:**
   ```bash
    pnpm run docker:logs
   ```

4. **Stop the bot:**
   ```bash
    pnpm run docker:down
   ```

### Watch Mode (auto rebuild on file changes)

Use watch mode during development to automatically sync source changes and restart quickly:

```bash
pnpm run docker:watch
```

This runs a dedicated `djmtbot-dev` service in attached mode (logs stream in the terminal).

- Source, config, and JSON changes use sync + restart (faster than full rebuilds)
- Dependency changes (`package.json`, `pnpm-lock.yaml`) trigger rebuilds

Press `Ctrl+C` to stop watch mode.

## Creating New Features (Components)
Visit [ExampleComponentTemplate.ts](https://github.com/DjMuffinTops/DJMTbot/blob/develop/src/ExampleComponentTemplate.ts) for an example component template. 

Copy and paste this file into the Components folder and implement your feature there. Make sure to read the comments throughly!

## Saving and Loading Component Data
You will first need to define an interface of all the data you'd like to save. It is assumed that the data you define will to be able to be run through `JSON.stringify()` and `JSON.parse()` successfully
```
// Your components property in the guild json will be structured as defined here
interface ExampleComponentSave {
    channelId: string,
    width: number,
    height: number
}
```
When you've defined this interface, you must apply it to your Component as a generic through the <> syntax.
```
// Component<YOUR_INTERFACE_HERE> means your giving your interface to your class as a generic
export class DynamicBanner extends Component<ExampleComponentSave> {
  ...
}
```

The `getSaveData` function must return data as defined in your interface as this is what is written to the guild json. 
```
async getSaveData(): Promise<ExampleComponentSave> {
    return {
        channelId: this.classChannelId,
        width: this.classWidth,
        height: this.classHeight
    };
}
```
Once `getSaveData` is properly defined, you can save your component's data to json at anytime by calling `this.djmtGuild.saveJSON()`
```
if (nextUrl) {
    this.classChannelId = "new channel";
    await this.djmtGuild.saveJSON(); // Save the component's current state to JSON
}
```

Data will load from the guild json everytime the bot starts up. Each component will receive its loaded data through the `afterLoadJSON`. You must handle the `loadedObject` yourself however you wish. You will most likely just be setting your components data. 

```
async afterLoadJSON(loadedObject: ExampleComponentSave | undefined): Promise<void> {
    if (loadedObject) {
            // Set this components fields to the loaded data
            this.classChannelId = loadedObject.channelId;
            this.classWidth = loadedObject.width;
            this.classHeight = loadedObject.height;
    }
}
```

How you translate your component data to savable json data and and translate the loaded data back to your component data is entirely up to your implementation. I suggest looking into existing components `saveJSON` and `afterLoadJSON` implementation to see how this can be done.

If your data is not converting to JSON properly, consider modifying the `JSON.stringify` [Replacer](https://github.com/DjMuffinTops/DJMTbot/blob/develop/src/HelperFunctions.ts#L45) and `JSON.parse` [Reviver](https://github.com/DjMuffinTops/DJMTbot/blob/develop/src/HelperFunctions.ts#L56) functions to work for you.

## Getting your component to run

You MUST add a line to export your Component class in [index.ts](https://github.com/DjMuffinTops/DJMTbot/blob/develop/src/Components/index.ts) for the bot to run your component!
```
// Component classes must be exported below to be run by the bot!
export { ExampleComponent } from './ExampleComponent';
export { AnotherComponent } from './AnotherComponent';
...
```

## How To Contribute
Please branch off of the `develop` branch, and make Pull Requests to the `develop` branch for anything you'd like to contribute!

If you require more events, functions, or changes in anywhere, please make an issue for it!

## Feel free to to contact me on discord for any help! DjMuffinTops#6590


