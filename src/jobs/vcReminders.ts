import {Client, TextChannel, VoiceChannel} from "discord.js";
import {GuildRegistry} from "../types/types";
const gRegistry = require("../../json/guild/guildRegistry.json");

// This is local as its not very important to store
let consecutiveHours: any = {};

export async function vcRemindersJob(client: Client) {
    console.log(`Running VC Reminder Job`);
    for (const guildId of Object.keys(gRegistry)) {
        let guild: GuildRegistry = gRegistry[guildId];
        if (guild?.vcChannelPairs) {
            // For each channel pair
            for (const pair of guild.vcChannelPairs) {
                // Make an entry for this guild
                if (!consecutiveHours[guildId]) {
                    consecutiveHours[guildId] = {}
                }
                // Make an entry for this pair, the key is the pair itself, the value is the number of hours
                if (!consecutiveHours[guildId][pair.toString()]){
                    consecutiveHours[guildId][pair.toString()] = 0;
                }
                const voiceChannelId = pair[0];
                const textChannelId = pair[1];
                const voiceChannel = (await client.channels.fetch(voiceChannelId) as VoiceChannel);
                const textChannel = (await client.channels.fetch(textChannelId) as TextChannel);
                // If someone is in the channel during the check, add an hour
                if (voiceChannel.members.size > 0) {
                    const hoursSoFar = consecutiveHours[guildId][pair.toString()];
                    const hoursMsg = `${hoursSoFar > 0 ? `(${hoursSoFar} consecutive hours)` : ''}`;
                    await textChannel.send(`Don't forget to save your work and stay hydrated! ${hoursMsg}`);
                    console.log(`Sent: Don't forget to save your work and stay hydrated! ${hoursMsg}`);
                    consecutiveHours[guildId][pair.toString()] += 1;
                } else {
                    consecutiveHours[guildId][pair.toString()] = 0;
                }
            }
        }

    }
}