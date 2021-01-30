// import {Client, Message} from "discord.js";
// import {isAdmin} from "./helper";
// import {getConfig, updateConfig} from "./config";
// import {setConsecutiveHours} from "../jobs/vcReminders";
//
// export async function setStarCmd(client: Client, args: string[], message: Message) {
//     // Admin only
//     if (!isAdmin(message)) {
//         await message.channel.send(`This command requires administrator permissions.`);
//         return;
//     }
//
//     const gConfig = await getConfig(message);
//     if (!gConfig.registered) {
//         await message.channel.send(`Please register your guild to use this command.`);
//         return;
//     }
//     let register = gConfig.register;
//     if (args.length === 0) {
//         let channelString = "";
//         if (register?.starChannels?.length > 0) {
//             register.starChannels.forEach((channelId: string) => {
//                 channelString += `<#${channelId}> `;
//             });
//             await message.channel.send(`Star Channels: ${channelString}`);
//         } else {
//             await message.channel.send(`No Star Channels have been set!`);
//         }
//     } else {
//         for (const rawChannelId of args) {
//             let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
//             try {
//                 const foundChannel = await client.channels.fetch(channelId);
//             } catch (e) {
//                 console.error(e);
//                 await message.channel.send("The given channel is invalid!");
//                 continue;
//             }
//             if (register?.starChannels?.includes(channelId)) {
//                 register.starChannels.splice(register.starChannels.indexOf(channelId), 1);
//                 await updateConfig(gConfig, message);
//                 await message.channel.send(`Removed ${rawChannelId} from the star channels list!`);
//             } else {
//                 if (!register?.starChannels) {
//                     register.starChannels = [];
//                 }
//                 register.starChannels.push(channelId);
//                 await updateConfig(gConfig, message);
//                 await message.channel.send(`Added ${rawChannelId} to the star channels list!`);
//             }
//         }
//     }
// }
//
// export async function setDotwCmd(client: Client, args: string[], message: Message) {
//     // Admin only
//     if (!isAdmin(message)) {
//         await message.channel.send(`This command requires administrator permissions.`);
//         return;
//     }
//     const gConfig = await getConfig(message);
//     if (!gConfig.registered) {
//         await message.channel.send(`Please register your guild to use this command.`);
//         return;
//     }
//     let register = gConfig.register;
//     if (args.length === 0) {
//         let channelString = "";
//         if (register?.dotwChannels?.length > 0) {
//             register.dotwChannels.forEach((channelId: string) => {
//                 channelString += `<#${channelId}> `;
//             });
//             await message.channel.send(`Day of the Week Channel: ${channelString}`);
//         } else {
//             await message.channel.send(`No Day of the Week Channel has been set!`);
//         }
//     } else {
//         for (const rawChannelId of args) {
//             let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
//             try {
//                 const foundChannel = await client.channels.fetch(channelId);
//             } catch (e) {
//                 console.error(e);
//                 await message.channel.send("The given channel is invalid!");
//                 continue;
//             }
//             if (register?.dotwChannels?.includes(channelId)) {
//                 register.dotwChannels = [];
//                 await updateConfig(gConfig, message);
//                 await message.channel.send(`Removed ${rawChannelId} as the Day of the Week Channel!`);
//             } else {
//                 if (!register.dotwChannels) {
//                     register.dotwChannels = [];
//                 }
//                 register.dotwChannels = [channelId];
//                 await updateConfig(gConfig, message);
//                 await message.channel.send(`Set ${rawChannelId} as the Day of the Week Channel!`);
//             }
//         }
//     }
// }
//
// export async function setHoursCmd(client: Client, args: string[], message: Message) {
//     // Admin only
//     if (!isAdmin(message)) {
//         await message.channel.send(`This command requires administrator permissions.`);
//         return;
//     }
//     if (args.length == 3) {
//         let guildId = message?.guild?.id;
//         const res = await setConsecutiveHours(guildId, args[0], args[1], Number(args[2]));
//         await message.channel.send(`${res}`);
//     } else {
//         await message.channel.send(`Can't set hours, needs two ids, voice and then text channel id`);
//     }
// }
