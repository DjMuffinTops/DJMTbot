import {Register, DayOfTheWeek, GuildConfig} from "../types/types";
import {Client, TextChannel} from "discord.js";
import {dayOfTheWeek} from "./dotwConstants";
import {promises as FileSystem} from "fs";
import {getConfig} from "../commands/config";

export async function dotwJob(client: Client) {
    const date = new Date();
    const today: DayOfTheWeek = dayOfTheWeek[date.getDay()];
    console.log(`Running Day of the Week Job: ${today.day} ${date.toLocaleDateString()} ${date.toLocaleTimeString()}` );
    const files = await FileSystem.readdir('./json/guilds');
    const guildIds = files.map((filename) =>  filename.substr(0, filename.indexOf('.')));
    for (const id of guildIds) {
        const gConfig: GuildConfig = await getConfig(id);
        const register = gConfig.register;
        if (register?.dotwChannels) {
            for (const channelId of register.dotwChannels) {
                const channel = (await client.channels.fetch(channelId) as TextChannel);
                // Determine which dotw post to send
                let randomMessage = today.messages[Math.floor(today.messages.length * Math.random())];
                await channel.send(`${randomMessage ? randomMessage : ''}`);
                console.log(`Sent: ${date.toLocaleTimeString()} ${randomMessage ? randomMessage : ''}` );
            }
        }
    }
}
