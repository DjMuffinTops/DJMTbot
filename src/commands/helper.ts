import {Message} from "discord.js";

export function isAdmin(message: Message) {
    return message?.member?.hasPermission("ADMINISTRATOR");
}
