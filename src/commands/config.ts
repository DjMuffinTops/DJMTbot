import {Client, Message} from "discord.js";
import {promises as FileSystem} from "fs";
import {GuildConfig} from "../types/types";
import {isAdmin} from "./helper";
const defaultConfig = require("../../json/defaultConfig.json");
export async function getConfig(src: Message): Promise<GuildConfig>;
export async function getConfig(src: string): Promise<GuildConfig>;

// export async function getConfig(src: Message | string): Promise<GuildConfig> {
//     let guildId: string | undefined;
//     if (typeof src === "string") {
//         // Given the id directly
//         guildId = src;
//     } else {
//         // Otherwise its a message
//         guildId = src?.guild?.id;
//         if (!guildId) {
//             throw `Could not get guildId from message ${src.content}`;
//         }
//     }
//     // let gConfig = require(`../../json/guilds/${guildId}.json`);
//     const buffer = await FileSystem.readFile(`./json/guilds/${guildId}.json`);
//     const gConfig = JSON.parse(buffer.toString());
//     return gConfig[guildId];
// }

// export async function updateConfig(config: GuildConfig, message: Message) {
//     let guildId: string | undefined = message?.guild?.id;
//     if (!guildId) {
//         throw `No guildId found, could not update config`;
//     }
//     const filename = `./json/guilds/${guildId}.json`;
//     await FileSystem.writeFile(filename, JSON.stringify({[guildId]: config},null, '\t'));
//     console.log(`${filename} updated`);
//     const gConfig = await getConfig(message);
//     // @ts-ignore
//     if (gConfig?.devMode){
//         await message.channel.send(`\`\`\`json\n${JSON.stringify({[guildId]: config},null, '\t')}\`\`\``);
//     }
// }

// export async function exportConfig(client: Client, args:string [], message: Message) {
//     // Admin only
//     if (!isAdmin(message)) {
//         await message.channel.send(`This command requires administrator permissions.`);
//         return;
//     }
//     let guildId = message?.guild?.id;
//     if (!guildId) {
//         console.log('No guild Id found');
//     }
//     const gConfig = await getConfig(message);
//     console.log(gConfig);
//     const jsonString = `"${guildId}": ${JSON.stringify(gConfig,null, '\t')}`;
//     await message.channel.send(`\`\`\`json\n${jsonString}\n\`\`\``);
// }

// export async function resetConfig(client: Client, message: Message, adminOverride: boolean = false) {
//     // Admin only
//     if (!adminOverride && !isAdmin(message)) {
//         await message.channel.send(`This command requires administrator permissions.`);
//         return;
//     }
//     await updateConfig(defaultConfig, message);
//     if (!adminOverride){
//         await message.channel.send(`Reset my guild config to default settings.`);
//     } else {
//         console.log(`Reset my guild config to default settings.`);
//
//     }
// }

export async function registerCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig  = await getConfig(message);
    // Make sure we have registered
    if (!gConfig.registered) {
        gConfig.registered = true;
        await updateConfig(gConfig, message);
        await message.channel.send(`Your guild has been registered.`);
    } else {
        await message.channel.send(`Your guild is already registered.`);
    }
}

export async function unregisterCmd (client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig  = await getConfig(message);
    // Make sure we have initialized gRegistry data for this guild
    if (gConfig.registered) {
        gConfig.registered = false;
        Object.assign(gConfig.register, {});
        await updateConfig(gConfig, message);
        await message.channel.send(`Your guild is no longer registered.`);
    } else {
        await message.channel.send(`Your guild is not registered.`);
    }
}

export async function devModeCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig = await getConfig(message);
    gConfig.devMode = !gConfig?.devMode;
    await updateConfig(gConfig, message);
    await message.channel.send(`Dev Mode ${gConfig.devMode ? "enabled" : "disabled" }.`);
}
