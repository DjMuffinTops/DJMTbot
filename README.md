# DJMTbot
A bot running Discord.js w/ Typescript, designed for the Pokemon Workshop Discord Server

## Install Yarn
[Install it here!](https://classic.yarnpkg.com/en/docs/install)

## Install Dependencies
```
yarn 
```

## Get a Discord Bot Token 
To get your own bot token, (create a bot!)[https://discordjs.guide/preparations/setting-up-a-bot-application.html#setting-up-a-bot-application]

You may also ask me for access to the PW Test server and dev bot token on Discord!

## Create a .env file in the root directory
```TOKEN``` and ```DEFAULT_PREFIX``` envrionment variables must be defined, one easy way to set them is by creating an `.env` file.

Your .env should look like this
```
TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
DEFAULT_PREFIX=djmt!
```
**DO NOT COMMIT YOUR .ENV file to GIT. 
If you accidentally expose your token publicly, RESET THE TOKEN through the discord developer page ASAP!**

## Start the Bot
```
yarn start
```

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
export class DynamicBanner extends Component<ExampleComponentSave> { // Component<YOUR_INTERFACE_HERE> means your giving your interface to your class as a generic
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


