// Load up the discord.js library
import * as Discord from 'discord.js';
// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
import {
    bCmd,
    bruhCmd,
    cheemsCmd, devModeCmd,
    helpCmd,
    pingCmd,
    registerCmd, resetConfig,
    sayCmd,
    setBruhCmd,
    setHoursCmd,
    setDotwCmd, setPrefixCmd,
    setStarCmd, setVcChannelPairs, unregisterCmd, updateConfigJson
} from "./commands";

import {GuildRegistry, GuildConfig} from "./types/types";
import {Message} from "discord.js";

const client = new Discord.Client();

// Here we load the guildConfigs.json file that contains our token and our prefix values.
require('dotenv').config();
const gRegistry = require("../json/guild/guildRegistry.json");
const gConfig = require("../json/guild/guildConfigs.json");
import startCronJobs from "./cron";



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

function checkStarChannel(guild: GuildRegistry, channelId: string, message: Message) {
    if (guild?.starChannels?.includes(channelId)) {
        message.react('⭐');
    }
}

client.on("message", async (message: Message) => {
    let guildId: string | undefined = message?.guild?.id;
    if (!guildId) {
        console.log('No guild id found');
        return;
    }
    let guildPrefix = gConfig[guildId]?.prefix ? gConfig[guildId].prefix : process.env.DEFAULT_PREFIX;
    let channelId = message.channel.id;
    let guild = gRegistry[guildId];
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;
    if (!gConfig[guildId]) {
        await resetConfig(client, message, true); // admin override
    }
    if (client?.user && message.mentions.has(client.user)) {
        await message.channel.send(`Type \`\`${gConfig[guildId].prefix}help\`\` to see my commands!`);
    }
    checkStarChannel(guild, channelId, message);
    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if (message.content.indexOf(guildPrefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args: string[] = message.content.slice(guildPrefix.length).trim().split(/ +/g);
    const command = args?.shift()?.toLowerCase();

    try {
        // Admin Commands
        if (command === "sethours") {
            console.log('hi');
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
        if (command === "resetconfig") {
            await resetConfig(client, message);
        }
        // end admin commands

        // For all users
        if (command === "b") {
            await bCmd(client, args, message);
        }
        if (command === "bruh") {
            const count: number = Number(args[0]);
            if (!gConfig[guildId].bruhCmd) {
                gConfig[guildId].bruhCmd = {}; // TODO: this probably shouldn't be done here
            } else {
                if (gConfig[guildId].bruhCmd.onCooldown) {
                    await message.channel.send(`Please wait, the bruh command is on cooldown.`);
                } else {
                    gConfig[guildId].bruhCmd.onCooldown = true;
                    await updateConfigJson(message);
                    await bruhCmd(client, args, message);
                    if (Number.isInteger(count) && count === 2) {
                        await bruhCmd(client, args, message);
                    }
                    setTimeout(async () => {
                        // Removes the user from the set after a minute
                        if (guildId) {
                            gConfig[guildId].bruhCmd.onCooldown = false; // TODO: no need to write this to a file
                            await updateConfigJson(message);
                        }
                    }, 2500);
                }
            }
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
        console.error(`Errored with message: ${message.content}`);
        console.error(`Errored with message: ${JSON.stringify(message, null, 2)}`);
        console.log(e);
    }
});
client.login(process.env.TOKEN);
