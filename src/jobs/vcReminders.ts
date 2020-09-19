import {Client, TextChannel, VoiceChannel} from "discord.js";
import {promises as FileSystem} from "fs";
import {GuildConfig} from "../types/types";
import {getConfig} from "../commands/config";
// This is local as its not very important to store
let consecutiveHours: any = {};
export async function setConsecutiveHours (guildId: any, voiceid: string, textid: string, hours: number) {
    let pair = [voiceid, textid];
    // Make an entry for this guild
    if (!consecutiveHours[guildId]) {
        consecutiveHours[guildId] = {}
    }
    consecutiveHours[guildId][pair.toString()] = hours;
    return `${pair.toString()} set to  ${consecutiveHours[guildId][pair.toString()]}`;
}

export async function vcRemindersJob(client: Client) {
    console.log(`Running VC Reminder Job`);
    const files = await FileSystem.readdir('./json/guilds');
    const guildIds = files.map((filename) =>  filename.substr(0, filename.indexOf('.')));
    for (const id of guildIds) {
        const gConfig: GuildConfig = await getConfig(id);
        const register = gConfig.register;
        if (register?.vcChannelPairs) {
            // For each channel pair
            for (const pair of register.vcChannelPairs) {
                // Make an entry for this guild
                if (!consecutiveHours[id]) {
                    consecutiveHours[id] = {}
                }
                // Make an entry for this pair, the key is the pair itself, the value is the number of hours
                if (!consecutiveHours[id][pair.toString()]){
                    consecutiveHours[id][pair.toString()] = 0;
                }
                const voiceChannelId = pair[0];
                const textChannelId = pair[1];
                const voiceChannel = (await client.channels.fetch(voiceChannelId) as VoiceChannel);
                const textChannel = (await client.channels.fetch(textChannelId) as TextChannel);
                // If someone is in the channel during the check and they are not a bot, add an hour
                if (voiceChannel.members.size > 0 && !voiceChannel.members.every(member => member.user.bot)) {
                    const hoursSoFar = consecutiveHours[id][pair.toString()];
                    const hoursMsg = `${hoursSoFar > 0 ? `(${hoursSoFar} consecutive hours)` : ''}`;
                    const finalMsg = `Don't forget to save your work and stay hydrated! ${hoursMsg}`;
                    await textChannel.send(finalMsg);
                    console.log(`Sent to ${pair.toString()} :${finalMsg}`);
                    consecutiveHours[id][pair.toString()] += 1;
                } else {
                    consecutiveHours[id][pair.toString()] = 0;
                }
            }
        }
    }
}
