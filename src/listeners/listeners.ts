import {Client, Message} from "discord.js";
import ReactBoard from "./reactBoard";
import {GuildConfig} from "../types/types";
import {getConfig} from "../commands/config";

export default async function onMessageListeners(client: Client, args: string[], message: Message) {
    const reactBoard = await ReactBoard.getInstance();
    await autoStar(client, args, message);
    await reactBoard.checkAutoReact(client, args, message);
}

export async function autoStar(client: Client, args: string[], message: Message) {
    let channelId = message.channel.id;
    const gConfig: GuildConfig = await getConfig(message);
    const register = gConfig.register;
    if (register?.starChannels?.includes(channelId)) {
        await message.react('⭐');
    }
}
