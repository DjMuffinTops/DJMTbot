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
            for (const pair of guild.vcChannelPairs) {
                if (!consecutiveHours[guildId]) {
                    consecutiveHours[guildId] = {}
                }
                if (!consecutiveHours[guildId][pair.toString()]){
                    consecutiveHours[guildId][pair.toString()] = 0;
                }
                consecutiveHours[guildId][pair.toString()] += 1;
                const voiceChannelId = pair[0];
                const textChannelId = pair[1];
                const voiceChannel = (await client.channels.fetch(voiceChannelId) as VoiceChannel);
                const textChannel = (await client.channels.fetch(textChannelId) as TextChannel);
                if (voiceChannel.members.size > 0) {
                    await textChannel.send(`Don't forget to save your work and stay hydrated! (${consecutiveHours[guildId][pair.toString()]} ${consecutiveHours[guildId][pair.toString()] > 1 ? 'consecutive hours' : 'hour'}) `);
                } else {
                    consecutiveHours[guildId][pair.toString()] = 0;
                }
            }
        }

    }
}