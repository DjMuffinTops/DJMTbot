# DJMTbot
A bot running Discord.js w/ Typescript, designed for the Pokemon Workshop Discord Server

## Docker Quick Start

Docker is the recommended way to run DJMTbot in production.

1. Install [Docker](https://docs.docker.com/get-docker/) and Docker Compose.
2. Create a `.env` file in the repository root using the environment table below.
3. Start the bot:
   ```bash
   pnpm run docker:up
   ```
4. Follow the logs:
   ```bash
   pnpm run docker:logs
   ```
5. Stop the bot:
   ```bash
   pnpm run docker:down
   ```

After changing source code or dependencies, rebuild the production image before
starting it again:

```bash
pnpm run docker:rebuild
pnpm run docker:up
```

Docker persists guild configuration in `json/` and application logs in `logs/`.

### Development Watch Mode

Use watch mode during development to automatically sync source changes and restart quickly:

```bash
pnpm run docker:watch
```

This runs a dedicated `djmtbot-dev` service in attached mode. Source, config,
and JSON changes use sync and restart; dependency changes require
`pnpm run docker:rebuild:dev`. Press `Ctrl+C` to stop watch mode.

<details>
<summary>Legacy bare-metal setup (old way to run DJMTbot)</summary>

The Docker setup above is the recommended way to run DJMTbot. The following
steps are kept for local development or older deployments.

## Install Node.js
To use discord.js, you'll need to [install Node.js here](https://nodejs.org). The project requires Node.js `>=24.13.1`.

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

## Start the Bot
```
pnpm start
```

`pnpm start` compiles TypeScript and starts the compiled application. The HTTP
health endpoint listens on port `8080` and returns status information at `/`.

</details>

## Get a Discord Bot Token 
To get your own bot token, [create a bot!](https://discordjs.guide/preparations/setting-up-a-bot-application.html#setting-up-a-bot-application)

You may also ask me for access to the PW Test server and dev bot token on Discord!

## Configure environment variables

Create a `.env` file in the repository root. Do not commit it.

## Environment Variables

| Variable | Required | Description | Example |
|---|---:|---|---|
| `TOKEN` | Yes | Discord bot token from the [Developer Portal](https://discord.com/developers/applications). | `TOKEN=your-token` |
| `APPLICATION_ID` | Yes | Discord application/client ID. | `APPLICATION_ID=123456789012345678` |
| `GUILD_IDS` | No | Comma-separated or JSON array of guild IDs to restrict which guilds the bot creates instances for. If omitted, all guilds are loaded. | `GUILD_IDS=123,456` |
| `LOG_LEVEL` | No | Winston log level: `error`, `warn`, `info`, or `debug`. Defaults to `info`. | `LOG_LEVEL=debug` |
| `PRETTY_LOGS` | No | Set to `true` to print metadata as indented JSON. Defaults to compact inline metadata. | `PRETTY_LOGS=true` |

**Example `.env` file:**
```env
TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
APPLICATION_ID=YOUR_APPLICATION_ID_HERE
GUILD_IDS=123456789012345678
LOG_LEVEL=info
PRETTY_LOGS=false
```

**⚠️ SECURITY WARNING:** DO NOT COMMIT YOUR `.env` FILE TO GIT!  
If you accidentally expose your token publicly, RESET THE TOKEN through the Discord Developer Portal immediately!

### Logging
Logs are automatically written to the `logs/` directory:
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/combined-YYYY-MM-DD.log` - All logs

Log files rotate daily and are retained for 14 days (max 20MB per file).

## Development commands

| Command | Purpose |
|---|---|
| `pnpm compile` | Type-check and compile TypeScript to `dist/`. |
| `pnpm build` | Build using the TypeScript build configuration. |
| `pnpm lint` | Run the repository lint checks. |
| `pnpm lint:fix` | Automatically fix supported lint and formatting issues. |
| `pnpm pretest` | Compile TypeScript before a test run. |
| `pnpm posttest` | Run lint after a test run. |
| `pnpm docker:dev` | Start the development Docker profile. |
| `pnpm docker:watch` | Run the development profile with source watch mode. |
| `pnpm docker:logs` | Follow production container logs. |
| `pnpm docker:down` | Stop Docker services. |

After dependency installation, Git hooks are configured automatically. The
pre-push hook runs `pnpm lint` and blocks pushes when linting fails.

## Music Bot Features

DJMTbot includes a full-featured music player powered by [DistTube](https://distube.js.org/):

### Available Commands
- `/play <url>` - Play a song from a direct YouTube or audio URL
- `/playfile <attachment>` - Play an audio file attachment (mp3, wav, ogg, flac, m4a, webm)
- `/skip` - Skip the current song
- `/stop` - Stop playing and clear the queue
- `/pause` / `/resume` - Control playback
- `/queue` - View the current queue
- `/nowplaying` - Show current song information
- `/volume <0-100>` - Set playback volume
- `/loop <off/song/queue>` - Set loop mode
- `/autoplay` - Toggle autoplay mode

Radio administration also supports adding, removing, listing, and selecting
configured stations. Administrative commands are restricted to members with
the Administrator permission.

### Supported Sources
With the integrated plugins, the bot can play music from:
- **YouTube URLs** - Resolved with `yt-dlp` and streamed without saving the media to disk
- **Direct Links** - Direct audio file URLs (mp3, wav, ogg, etc.)
- **Local Files** - Audio files uploaded to Discord

### Requirements
- Bot must be in a voice channel to play music
- Users must be in a voice channel to use music commands

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
