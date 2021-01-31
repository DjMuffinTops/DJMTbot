import {Client, Message} from "discord.js";
import {isAdmin} from "./helper";
import {getConfig, updateConfig} from "./config";
import {setConsecutiveHours} from "../jobs/vcReminders";


export async function setHoursCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    if (args.length == 3) {
        let guildId = message?.guild?.id;
        const res = await setConsecutiveHours(guildId, args[0], args[1], Number(args[2]));
        await message.channel.send(`${res}`);
    } else {
        await message.channel.send(`Can't set hours, needs two ids, voice and then text channel id`);
    }
}
