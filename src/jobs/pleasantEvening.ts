import {GuildConfig} from "../types/types";
import {Client, TextChannel} from "discord.js";
import {promises as FileSystem} from "fs";
import {getConfig} from "../commands/config";

export async function pleasantEvening(client: Client) {
    if (Math.random() < .4) {
    const files = await FileSystem.readdir('./json/guilds');
        const guildIds = files.map((filename) => filename.substr(0, filename.indexOf('.')));
        for (const id of guildIds) {
            const gConfig: GuildConfig = await getConfig(id);
            const register = gConfig.register;

            if (register?.dotwChannels) {
                for (const channelId of register.dotwChannels) {
                    try {
                        const channel = (await client.channels.fetch(channelId) as TextChannel);
                        // Determine which dotw post to send
                        const msg = 'https://cdn.discordapp.com/attachments/683557958327730219/793229701920718858/unknown.png';
                        await channel.send(msg);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
}
