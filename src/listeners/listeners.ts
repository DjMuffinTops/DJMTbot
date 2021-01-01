import {Client, Message} from "discord.js";
import {autoStar} from "./autostar";

export default async function executeListeners(client: Client, args: string[], message: Message) {
    await autoStar(client, args, message);
}
