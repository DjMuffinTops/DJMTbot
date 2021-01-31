import {Message} from "discord.js";

export function isAdmin(message: Message) {
    return message?.member?.hasPermission("ADMINISTRATOR");
}

export function JSONStringifyReplacer(key: any, value:any) {
    if(value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}

export function JSONStringifyReviver(key: any, value:any) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}
