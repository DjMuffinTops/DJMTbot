import cron from 'node-cron';
const gRegistry = require("./json/guild/guildRegistry.json");
import {Client, TextChannel} from "discord.js";
import {GuildRegistry} from "./types/types";

async function start(client: Client) {
    console.log('starting cron jobs');
    cron.schedule('* * * * * *', async () => {
        for (const guildId of Object.keys(gRegistry)) {
            let guild: GuildRegistry = gRegistry[guildId];
            if (guild && guild.dotwChannels) {
                for (const channelId of guild.dotwChannels) {
                    const channel = (await client.channels.fetch(channelId) as TextChannel);
                    await channel.send('scheduled cron message');
                    console.log('cron triggered');
                }
            }
        }
    });
}

module.exports =  { start };
