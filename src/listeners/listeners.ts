import {Client, Message} from "discord.js";
import ReactBoard from "./reactBoard";

export default async function onMessageListeners(client: Client, args: string[], message: Message) {
    const reactBoard = await ReactBoard.getInstance();
    await reactBoard.checkAutoReact(client, args, message);
}
