// Load up the discord.js library
import * as Discord from 'discord.js';
// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
import {Register, GuildConfig} from "./types/types";
import {Message} from "discord.js";

const client = new Discord.Client();

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
    setBruhCmd,
    setDotwCmd, setHoursCmd,
    setPrefixCmd,
    setStarCmd,
    setVcChannelPairs
} from "./commands/setters";
import {cheemsCmd} from "./commands/cheems";
import {bCmd} from "./commands/bSpeak";
import {bruhCmd} from "./commands/bruh";
import {autoStar} from "./listeners/autostar";



client.on("ready", async () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client?.user?.setActivity(`@DJMTbot for help! | ${client.users.cache.size} users`);
    await startCronJobs(client);

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
    await autoStar(client, args, message);
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
    const command = args?.shift()?.toLowerCase();

    try {
        // Admin Commands
        if (command === "sethours") {
            await setHoursCmd(client, args, message);
        }
        if (command === "setstar") {
            await setStarCmd(client, args, message);
        }
        if (command === "setbruh") {
            await setBruhCmd(client, args, message);
        }
        if (command === "setdotw") {
            await setDotwCmd(client, args, message);
        }
        if (command === "setvcpairs") {
            await setVcChannelPairs(client, args, message);
        }
        if (command === "register") {
            await registerCmd(client, args, message);
        }
        if (command === "unregister") {
            await unregisterCmd(client, args, message);
        }
        if (command === "dev") {
            await devModeCmd(client, args, message);
        }
        if (command === "prefix") {
            await setPrefixCmd(client, args, message);
        }
        if (command === "exportconfig") {
            await exportConfig(client, args, message);
        }
        if (command === "resetconfig") {
            await resetConfig(client, message);
        }
        // end admin commands

        // For all users
        if (command === "b") {
            await bCmd(client, args, message);
        }
        if (command === "bruh") {
            await bruhCmd(client, args, message);
        }
        if (command === "cheems") {
            await cheemsCmd(client, args, message);
        }
        if (command === "help") {
            await helpCmd(client, args, message);
        }
        if (command === "ping") {
            await pingCmd(client, args, message);
        }
        if (command === "say") {
            await sayCmd(client, args, message);
        }
    } catch (e) {
        console.error(`Errored with message content: ${message.content}`);
        console.error(`Errored with message: ${JSON.stringify(message, null, 2)}`);
        console.log(e);
    }
});
client.login(process.env.TOKEN);
