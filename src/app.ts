// Load up the discord.js library
import * as Discord from 'discord.js';
// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
import {Register, GuildConfig} from "./types/types";
import {Message, TextChannel} from "discord.js";

export const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
let reactBoard: ReactBoard; // TODO: This is currently global, needs a class that has one react board per guild
// Here we load the guildConfigs.json file that contains our token and our prefix values.
require('dotenv').config();

// const gConfig = require("../json/guilds/guildConfigs.json");
import startCronJobs from "./cron";
import {
    devModeCmd,
    exportConfig,
    getConfig, registerCmd,
    resetConfig,
    unregisterCmd
} from "./commands/config";
import {helpCmd, pingCmd, sayCmd} from "./commands/utility";
import {
    setBruhCmd, setDebugChannel,
    setDotwCmd, setHoursCmd,
    setPrefixCmd, setStarCmd,
    setVcChannelPairs
} from "./commands/setters";
import {cheemsCmd} from "./commands/cheems";
import {bCmd} from "./commands/bSpeak";
import {bruhCmd} from "./commands/bruh";
import {CommandStrings} from "./commands/CommandStrings";
import executeListeners from "./listeners/listeners";
import ReactBoard from "./listeners/reactBoard";



client.on("ready", async () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client?.user?.setActivity(`@DJMTbot for help!`);
    reactBoard = await ReactBoard.getInstance();
    await startCronJobs(client);
    // const debugChannel = (await client.channels.fetch(reactMapValue.channelId) as TextChannel);

});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client?.user?.setActivity(`@DJMTbot for help! | ${client.users.cache.size} users`);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client?.user?.setActivity(`@DJMTbot for help! | ${client.users.cache.size} users`);
});

client.on('messageReactionAdd', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    await reactBoard.reactBoardCheck(client, reaction);
});

client.on("message", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    let guildId: string | undefined = message?.guild?.id;
    if (!guildId) {
        console.log('No guild id found');
        return;
    }
    let gConfig: GuildConfig | undefined = undefined;
    try {
        gConfig = await getConfig(message);
    } catch (e) {
        // @ts-ignore
        await resetConfig(client, message, true); // admin override
        gConfig = await getConfig(message);
    }
    let args: string[] = message.content.trim().split(/ +/g);
    // Listeners
    await executeListeners(client, args, message);
    // @ts-ignore
    let guildPrefix = gConfig?.prefix ? gConfig.prefix : process.env.DEFAULT_PREFIX as string;
    // Display the prefix when mentioned
    if (client?.user && message.mentions.has(client.user)) {
        // @ts-ignore
        await message.channel.send(`Type \`\`${gConfig.prefix}help\`\` to see my commands!`);
    }
    // Ignore if it doesn't start with our prefix
    if (message.content.indexOf(guildPrefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    args = message.content.slice(guildPrefix.length).trim().split(/ +/g);
    const command = args?.shift()?.toLowerCase() || '';

    try {
        if ((Object.values(CommandStrings) as string[]).includes(command)) {
            message.channel.startTyping();
            // Admin Commands
            if (command === CommandStrings.SET_DEBUG_CHANNEL) {
                await setDebugChannel(client, args, message);
            }
            if (command === CommandStrings.SET_REACT_PAIRS) {
                await reactBoard.setReactPairsCmd(client, args, message);
            }
            if (command === CommandStrings.SET_HOURS) {
                await setHoursCmd(client, args, message);
            }
            if (command === CommandStrings.SET_STAR) {
                await setStarCmd(client, args, message);
            }
            if (command === CommandStrings.SET_AUTO_REACT) {
                await reactBoard.setAutoReactCmd(client, args, message);
            }
            if (command === CommandStrings.SET_BRUH) {
                await setBruhCmd(client, args, message);
            }
            if (command === CommandStrings.SET_DOTW) {
                await setDotwCmd(client, args, message);
            }
            if (command === CommandStrings.SET_VC_PAIRS) {
                await setVcChannelPairs(client, args, message);
            }
            if (command === CommandStrings.REGISTER) {
                await registerCmd(client, args, message);
            }
            if (command === CommandStrings.UNREGISTER) {
                await unregisterCmd(client, args, message);
            }
            if (command === CommandStrings.DEV_MODE) {
                await devModeCmd(client, args, message);
            }
            if (command === CommandStrings.SET_PREFIX) {
                await setPrefixCmd(client, args, message);
            }
            if (command === CommandStrings.EXPORT_CONFIG) {
                await exportConfig(client, args, message);
            }
            if (command === CommandStrings.RESET_CONFIG) {
                await resetConfig(client, message);
            }
            // end admin commands

            // For all users
            if (command === CommandStrings.B_SPEAK) {
                await bCmd(client, args, message);
            }
            if (command === CommandStrings.BRUH) {
                await bruhCmd(client, args, message);
            }
            if (command === CommandStrings.CHEEMS) {
                await cheemsCmd(client, args, message);
            }
            if (command === CommandStrings.HELP) {
                await helpCmd(client, args, message);
            }
            if (command === CommandStrings.PING) {
                await pingCmd(client, args, message);
            }
            if (command === CommandStrings.SAY) {
                await sayCmd(client, args, message);
            }
        }
    } catch (e) {
        console.error(`Errored with message content: ${message.content}`);
        console.error(`Errored with message: ${JSON.stringify(message, null, 2)}`);
        console.log(e);
    }
    message.channel.stopTyping(true);
});
client.login(process.env.TOKEN);
