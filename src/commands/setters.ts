import {Client, Message} from "discord.js";
import {isAdmin} from "./helper";
import {getConfig, updateConfig} from "./config";
import {setConsecutiveHours} from "../jobs/vcReminders";
export async function setDebugChannel(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig = await getConfig(message);
    if (gConfig.debugChannel === message.channel.id) {
        gConfig.debugChannel = "";
        await updateConfig(gConfig, message);
        await message.channel.send(`${message.channel.toString()} is no longer set as the debugChannel`);
    } else {
        gConfig.debugChannel = message.channel.id;
        await updateConfig(gConfig, message);
        await message.channel.send(`${message.channel.toString()} is now set as the debugChannel channel`);
    }
}

export async function setBruhCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig = await getConfig(message);
    if (!gConfig.registered) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    let register = gConfig.register;
    if (args.length === 0) {
        let channelString = "";
        if (register?.bruhChannels?.length > 0) {
            register.bruhChannels.forEach((channelId: string) => {
                channelString += `<#${channelId}> `;
            });
            await message.channel.send(`Bruh Channel: ${channelString}`);
        } else {
            await message.channel.send(`No Bruh Channels have been set!`);
        }
    } else {
        for (const channelMentionStr of args) {
            // Get the ID from the mention
            let channelId = channelMentionStr.substring(2, channelMentionStr.indexOf('>'));
            try {
                // Test if the channel exists before moving on
                const foundChannel = await client.channels.fetch(channelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                continue;
            }
            // Remove the channel if it's already in the list
            if (register?.bruhChannels?.includes(channelId)) {
                register.bruhChannels.splice(register.bruhChannels.indexOf(channelId), 1);
                await updateConfig(gConfig, message);
                await message.channel.send(`Removed ${channelMentionStr} from the bruh channels list!`);
            } else {
                // If bruhChannels hasn't been initialized, do that
                if (!register?.bruhChannels) {
                    register.bruhChannels = [];
                }
                // Push the channelId to the bruhChannels list
                register.bruhChannels.push(channelId);
                await updateConfig(gConfig, message);
                await message.channel.send(`Added ${channelMentionStr} to the bruh channels list!`);
            }
        }
    }
}
export async function setStarCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }

    const gConfig = await getConfig(message);
    if (!gConfig.registered) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    let register = gConfig.register;
    if (args.length === 0) {
        let channelString = "";
        if (register?.starChannels?.length > 0) {
            register.starChannels.forEach((channelId: string) => {
                channelString += `<#${channelId}> `;
            });
            await message.channel.send(`Star Channels: ${channelString}`);
        } else {
            await message.channel.send(`No Star Channels have been set!`);
        }
    } else {
        for (const rawChannelId of args) {
            let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
            try {
                const foundChannel = await client.channels.fetch(channelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                continue;
            }
            if (register?.starChannels?.includes(channelId)) {
                register.starChannels.splice(register.starChannels.indexOf(channelId), 1);
                await updateConfig(gConfig, message);
                await message.channel.send(`Removed ${rawChannelId} from the star channels list!`);
            } else {
                if (!register?.starChannels) {
                    register.starChannels = [];
                }
                register.starChannels.push(channelId);
                await updateConfig(gConfig, message);
                await message.channel.send(`Added ${rawChannelId} to the star channels list!`);
            }
        }
    }
}

export async function setDotwCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig = await getConfig(message);
    if (!gConfig.registered) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    let register = gConfig.register;
    if (args.length === 0) {
        let channelString = "";
        if (register?.dotwChannels?.length > 0) {
            register.dotwChannels.forEach((channelId: string) => {
                channelString += `<#${channelId}> `;
            });
            await message.channel.send(`Day of the Week Channel: ${channelString}`);
        } else {
            await message.channel.send(`No Day of the Week Channel has been set!`);
        }
    } else {
        for (const rawChannelId of args) {
            let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
            try {
                const foundChannel = await client.channels.fetch(channelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                continue;
            }
            if (register?.dotwChannels?.includes(channelId)) {
                register.dotwChannels = [];
                await updateConfig(gConfig, message);
                await message.channel.send(`Removed ${rawChannelId} as the Day of the Week Channel!`);
            } else {
                if (!register.dotwChannels) {
                    register.dotwChannels = [];
                }
                register.dotwChannels = [channelId];
                await updateConfig(gConfig, message);
                await message.channel.send(`Set ${rawChannelId} as the Day of the Week Channel!`);
            }
        }
    }
}

export async function setVcChannelPairs(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }

    const gConfig = await getConfig(message);
    if (!gConfig.registered) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    let register = gConfig.register;
    if (args.length === 0) {
        let channelString = "";
        if (register?.vcChannelPairs?.length > 0) {
            register.vcChannelPairs.forEach((channelIdPair: string[]) => {
                channelString += `| <#${channelIdPair[0]}> <#${channelIdPair[1]}> |`;
            });
            await message.channel.send(`VC Channels: ${channelString}`);
        } else {
            await message.channel.send(`No VC Channel Pairs have been set!`);
        }
    } else if (args.length === 2) {
        const voiceChannelId = args[0]; // Voice channel must be raw due to lack of mention
        const rawTextChannelId = args[1];
        let textChannelId = rawTextChannelId.substring(2, rawTextChannelId.indexOf('>'));
        const pair = [voiceChannelId, textChannelId];
        let foundVoiceChannel = undefined;
        let foundTextChannel = undefined;
        try {
            foundVoiceChannel = await client.channels.fetch(voiceChannelId);
            foundTextChannel = await client.channels.fetch(textChannelId);
        } catch (e) {
            console.error(e);
            await message.channel.send("The given channel is invalid! Make sure the given channels are the correct types (use help command for more info)");
            return;
        }
        if (foundVoiceChannel.type !== "voice" && foundTextChannel.type !== "text") {
            await message.channel.send(`The given channels are not the correct types`);
            return;
        }
        if (register?.vcChannelPairs?.length > 0) {
            for (const presentPair of register.vcChannelPairs) {
               if (presentPair[0] === pair[0] && presentPair[1] === pair[1]) {
                   register.vcChannelPairs.splice(register.vcChannelPairs.indexOf(pair), 1);
                   await updateConfig(gConfig, message);
                   await message.channel.send(`Removed ${pair} from VC Channels list!`);
                   return;
               }
            }
        } else {
            if (!register?.vcChannelPairs) {
                register.vcChannelPairs = [];
            }
        }
        register.vcChannelPairs.push(pair);
        await updateConfig(gConfig, message);
        await message.channel.send(`Added ${pair} to the VC Channels list!`);
    } else {
        await message.channel.send(`Requires exactly two arguments, a voice channel id, and a text channel mention. You gave ${args}`);

    }
}

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


export async function setPrefixCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    const gConfig = await getConfig(message);
    if (args.length === 0) {
        gConfig.prefix = process.env.DEFAULT_PREFIX as string;
        await updateConfig(gConfig, message);
        await message.channel.send(`Set my prefix to \`\`${process.env.DEFAULT_PREFIX}\`\``);
    } else if (args.length === 1) {
        gConfig.prefix = args[0] ? args[0] : process.env.DEFAULT_PREFIX as string;
        await updateConfig(gConfig, message);
        await message.channel.send(`Set my prefix to \`\`${gConfig.prefix}\`\``);
    } else {
        await message.channel.send(`Please enter a single prefix.`);
    }
}
