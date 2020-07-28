import {GuildRegistry, DayOfTheWeek} from "../types/types";
import {Client, TextChannel} from "discord.js";
import {dayOfTheWeek} from "./dotwConstants";

const gRegistry = require("../../json/guild/guildRegistry.json");

export async function dotwJob(client: Client) {
    const date = new Date();
    const today: DayOfTheWeek = dayOfTheWeek[date.getDay()];
    console.log(`Running Day of the Week Job: ${today.day} ${date.toLocaleDateString()} ${date.toLocaleTimeString()}` );
    for (const guildId of Object.keys(gRegistry)) {
        let guild: GuildRegistry = gRegistry[guildId];
        if (guild && guild.dotwChannels) {
            for (const channelId of guild.dotwChannels) {
                const channel = (await client.channels.fetch(channelId) as TextChannel);
                // Determine which dotw post to send
                let randomMessage = today.messages[Math.floor(today.messages.length * Math.random())];
                await channel.send(`${date.toLocaleTimeString()} ${randomMessage ? randomMessage : ''}`);
                console.log(`Sent: ${date.toLocaleTimeString()} ${randomMessage ? randomMessage : ''}` );
            }
        }
    }
}
