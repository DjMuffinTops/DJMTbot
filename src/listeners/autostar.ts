import {Client, Message} from "discord.js";
import {GuildConfig} from "../types/types";
import {getConfig} from "../commands/config";

export async function autoStar(client: Client, args: string[], message: Message) {
    let channelId = message.channel.id;
    const gConfig: GuildConfig = await getConfig(message);
    const register = gConfig.register;
    if (register?.starChannels?.includes(channelId)) {
        await message.react('⭐');
    }
}
