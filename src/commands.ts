import {promises as FileSystem} from "fs";
import {Client, Message, MessageAttachment, TextChannel} from "discord.js";
const gRegistry = require("../json/guild/guildRegistry.json");
const gConfig = require("../json/guild/guildConfigs.json");
const defaultConfig = require("../json/defaultConfig.json");

function isAdmin(message: Message) {
    return message?.member?.hasPermission("ADMINISTRATOR");
}

function isGuildRegistered(guildId: string) {
    return gRegistry[guildId] !== undefined;
}

function insert (str: string, index: number, insert: string) {
    if (index >= 0)
    {
        return str.substring(0, index + 1) + insert + str.substring(index + 1, str.length);
    } else {
        return str;
    }
}

export async function updateConfigJson(message: Message) {
    let guildId: string | undefined = message?.guild?.id;
    await FileSystem.writeFile('./json/guild/guildConfigs.json', JSON.stringify(gConfig,null, '\t'));
    console.log(`config.js updated`);
    if (guildId && gConfig[guildId].devMode){
        await message.channel.send(`\`\`\`json\n${JSON.stringify(gConfig[guildId],null, '\t')}\`\`\``);
    }
}

export async function updateGuildsJson(message: Message) {
    let guildId: string | undefined = message?.guild?.id;
    await FileSystem.writeFile('./json/guild/guildRegistry.json', JSON.stringify(gRegistry,null, '\t'));
    console.log(`guilds.js updated`);
    if (guildId && gConfig[guildId].devMode){
        await message.channel.send(`\`\`\`json\n${JSON.stringify(gRegistry[guildId],null, '\t')}\`\`\``);
    }
}

export async function setPrefixCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }
    if (args.length === 0) {
        gConfig[guildId].prefix = process.env.DEFAULT_PREFIX;
        await updateConfigJson(message);
        await message.channel.send(`Set my prefix to \`\`${process.env.DEFAULT_PREFIX}\`\``);
    } else if (args.length === 1) {
        gConfig[guildId].prefix = args[0];
        await updateConfigJson(message);
        await message.channel.send(`Set my prefix to \`\`${gConfig[guildId].prefix}\`\``);
    } else {
        await message.channel.send(`Please enter a single prefix.`);
    }
}

export async function devModeCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }
    gConfig[guildId].devMode = !gConfig[guildId].devMode;
    await updateConfigJson(message);
    await message.channel.send(`Dev Mode ${gConfig[guildId].devMode ? "enabled" : "disabled" }.`);
}

export async function resetConfig(client: Client, message: Message, adminOverride: boolean = false) {
    // Admin only
    if (!adminOverride && !isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }
    delete gConfig[guildId];
    gConfig[guildId] = defaultConfig;
    await updateConfigJson(message);
    await message.channel.send(`Reset my guild config to default settings.`);
}

export async function registerCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }
    // Make sure we have initialized gRegistry data for this guild
    if (!isGuildRegistered(guildId)) {
        gRegistry[guildId] = {};
        await updateGuildsJson(message);
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
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }
    // Make sure we have initialized gRegistry data for this guild
    if (isGuildRegistered(guildId)) {
        delete gRegistry[guildId];
        await updateGuildsJson(message);

        await message.channel.send(`Your guild is no longer registered.`);
    } else {
        await message.channel.send(`Your guild is not registered.`);
    }
}

export async function cheemsCmd(client: Client, args: string[], message: Message) {
    const cheemsChars = ['a', 'e', 'i', 'o', 'u', 'r'];
    const CHEEMS_M = 'm';
    const ADDTIONAL_CHANCE = .15;
    const minimumRequired = 1; // The minimum amount of m's to add
    let result = "";
    let indices: number[] = [];
    let index = 0;

    // Find all indices where a vowel exists
    args.forEach((word) => {
        for (let i = 0; i < word.length; i++) {
            const character = word.charAt(i);
            let characterLower = character.toLowerCase(); // output text will be lowercase
            result += characterLower;
            // if we find a vowel, save the current index in our indices array
            if (cheemsChars.includes(characterLower) && // is a cheems char
                i + 1 < word.length && // is not the end
                !cheemsChars.includes(word.charAt(i + 1)) && // next letter is not a cheems char
                word.charAt(i + 1) !== CHEEMS_M) { // next letter is not 'm'
                indices.push(index);
            }
            index++;
        }
        result += ' ';
        index++;
    });

    // Add the minimum required m's to our result string
    for (let charAdditions = 0; charAdditions < minimumRequired; charAdditions++) {
        if (indices.length > 0) {
            const chosenIndex = Math.round(Math.random() * indices.length); // choose an index from our indices array at random
            const requiredIndex = indices[chosenIndex];
            // We need to increment the indices of all cheemsChars after the chosen one since we're adding an m to the string
            for (let i = chosenIndex + 1; i < indices.length; i++) {
                indices[i]++;
            }
            // Insert an m, and remove the index for our list of indices
            result = insert(result, requiredIndex, CHEEMS_M);
            indices.splice(chosenIndex, 1)
        }
    }


    // For the rest of the remaining indices, use random chance to potentially add an m
    let randomsAdded = 0;
    indices.forEach((index, loopIndex) => {
        if (Math.random() < ADDTIONAL_CHANCE) {
            result = insert(result, index + randomsAdded, CHEEMS_M);
            indices.splice(loopIndex, 1);
            randomsAdded++;
        }
    });
    // And we get the bot to say the thing:
    await message.channel.send(result.length > 0 ? result : "Given message was empty, try typing something this time.");
}
export async function pingCmd(client: Client, args: string[], message: Message) {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
}

export async function sayCmd(client: Client, args: string[], message: Message) {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // And we get the bot to say the thing:
    await message.channel.send(sayMessage.length ? sayMessage : `You didn't say anything! >:(`);
}

export async function bCmd(client: Client, args: string[], message: Message) {
    const bChars = ['a', 'e', 'i', 'o', 'u', 'r'];
    let result = "";
    let B_OPTIONS = ['b', '🅱️'];
    let B_EMOJI_CHANCE = .05;
    for (let i = 0; i < args.length; i++) {
        let word = args[i];
        let previous = "";
        for (let j = 0; j < word.length; j++) {
            if (word.charAt(j).match(/^[a-zA-Z]+$/)) {
                let bChoice = B_OPTIONS[Math.random() < B_EMOJI_CHANCE ? 1 : 0];
                if (bChars.includes(word.charAt(j).toLowerCase())) {
                    result += `${previous}${bChoice}${word} `;
                } else {
                    result += `${previous}${bChoice}${word.substring(j + 1)} `;
                }
                break;
            } else {
                previous += word.charAt(j);
            }
        }
    }
    await message.channel.send(result.length > 0 ? result : "Given message was empty, try typing something this time.");
}

export async function helpCmd(client: Client, args: string[], message: Message) {
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }
    let prefix = gConfig[guildId].prefix;
    let helpCommands =
        `#FUN
${prefix}cheems [text] -> Cheemsifies the given text.\n
${prefix}b [text] -> Applies b-speak to the given text.\n
${prefix}bruh -> Spits out a random message contained in marked bruh channels. Admins can mark channels to read from using the setbruh command.`;
    let helpAdminCommands =
        `#ADMIN ONLY
--------------------------------------------------------------------------------------
If the bot seems to not be responding, try using the resetconfig command (my bad ^^)
--------------------------------------------------------------------------------------
${prefix}prefix [text] -> Sets a new command prefix for this bot. Use this command without text to reset to the default: \`${process.env.DEFAULT_PREFIX}\`\n
${prefix}register -> Registers this server to have data saved that is required for certain commands.\n
${prefix}unregister -> Unregisters this server and deletes all register data saved.\n
${prefix}resetconfig -> Restores the guild's config settings to the bot's default config.\n
${prefix}dev -> When enabled, the bot will print out the states of the guild config, and guild registry.\n
${prefix}setstar [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be auto starred by the bot. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setbruh [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be used by the bruh command. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setdotw [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel to get Day of the Week messages. Will send a message to the channel at 11:59 EST everyday (does not account for daylight savings). Use command without mentioning channels to see the list of marked channels.\n
${prefix}setvcpairs [VoiceChannelId] [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channels as a pair. Will send occasional reminder messages to the vc text channel. Use command without mentioning channels to see the list of marked channel pairs.\n\n`;

    if (isAdmin(message)) {
        await message.channel.send(`\`\`\`css\n${helpAdminCommands}\`\`\``);
    }
    await message.channel.send(`\`\`\`css\n${helpCommands}\`\`\``);
}

export async function setStarCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }

    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }

    if (!isGuildRegistered(guildId)) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }

    if (args.length === 0) {
        let channelString = "";
        if (gRegistry[guildId] && gRegistry[guildId].starChannels && gRegistry[guildId].starChannels.length > 0) {
            gRegistry[guildId].starChannels.forEach((channelId: string) => {
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
            let guild = gRegistry[guildId];
            if (guild && guild.starChannels && guild.starChannels.includes(channelId)) {
                guild.starChannels.splice(guild.starChannels.indexOf(channelId), 1);
                await updateGuildsJson(message);
                await message.channel.send(`Removed ${rawChannelId} from the star channels list!`);
            } else {
                if (!guild.starChannels) {
                    guild.starChannels = [];
                }
                guild.starChannels.push(channelId);
                await updateGuildsJson(message);
                await message.channel.send(`Added ${rawChannelId} to the star channels list!`);
            }
        }
    }
}

export async function bruhCmd(client: Client, args: string[], message: Message) {
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }

    if (!isGuildRegistered(guildId)) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    try {
        let guild = gRegistry[guildId];
        let attachmentList = [];
        let msgContent = '';
        if (guild && guild.bruhChannels && guild.bruhChannels.length > 0) {
            let bruhChannelId = guild.bruhChannels[Math.floor(guild.bruhChannels.length * Math.random())]; // pick a random bruh channel id
            let channel: TextChannel | undefined = (message?.guild?.channels?.cache?.get(bruhChannelId) as TextChannel); // get the channel object


            let messagesArray = [];
            let last_id = "";
            let messages = null;
            // TODO:: implement an option to limit how many messages to parse
            // let iterations = (limit / 100) + (limit % 100 ? 1 : 0);
            do {
                const options = {
                    limit: 100
                };
                if (last_id.length > 0) {
                    // @ts-ignore
                    options.before = last_id
                }
                messages = await channel?.messages?.fetch(options);
                messagesArray.push(...messages.array());
                // console.log(`msg length ${messages.array().length}`);
                if (messages.array().length > 0) {
                    last_id = messages.array()[(messages.array().length - 1)].id;
                }
                // iterations--;
            } while (messages.size > 0);


            // let messages = await channel.messages.fetch(); // get the messages
            // let messagesArray = messages.array(); // get it as an array





            let randomIndex = Math.floor(messagesArray.length * Math.random()); // choose a random message index
            console.log(`size: ${messagesArray.length} | index: ${randomIndex}`);
            let randomMsg = await messagesArray[randomIndex]; // get the random message
            if (randomMsg) {
                // If theres an embed, its probably a floof bot star embed
                if (randomMsg.embeds && randomMsg.embeds.length > 0) {
                    let embed = randomMsg.embeds[0];
                    // console.log(embed);
                    if (embed.fields) {
                        embed.fields.forEach((field: any) => {
                            if (field.name === 'Message') {
                                msgContent = field.value;
                            }
                        });
                    }
                    if (embed?.image?.url) {
                        const attachment = await new MessageAttachment(embed.image.url);
                        attachmentList.push(attachment);
                    }
                    if (embed?.video?.url) {
                        const attachment = await new MessageAttachment(embed.video.url);
                        attachmentList.push(attachment);
                    }

                    if (attachmentList.length <= 0) {
                        // If the floof bot embed doesnt have an image or video, there might be one there, so we have to
                        // check for it
                        let descriptionStr = embed.description || '';
                        let messageId: string = descriptionStr.substring(descriptionStr.lastIndexOf('/') + 1, descriptionStr.length - 1);
                        let channelId = '';
                        let searchMessage = null;
                        if (embed.fields) {
                            embed.fields.forEach((field: any) => {
                                if (field.name === 'Channel') {
                                    channelId = field.value.substring(field.value.indexOf('#') + 1, field.value.length - 1);
                                }
                            });
                        }
                        if (channelId) {
                            const foundChannel = (await client.channels.fetch(channelId) as TextChannel);
                            searchMessage = await foundChannel.messages.fetch(messageId);
                            msgContent = searchMessage.content;
                            // TODO: if search message isnt found try again with another random message?
                            searchMessage.attachments.forEach((attachment: MessageAttachment) => {
                                // console.log(attachment);
                                // do something with the attachment
                                const msgattachment = new MessageAttachment(attachment.url);
                                attachmentList.push(msgattachment);
                            });
                        }
                    }
                } else {
                    // Its probably a standard message, get the attachments and relay the content
                    randomMsg.attachments.forEach((attachment: MessageAttachment) => {
                        // do something with the attachment
                        attachmentList.push(new MessageAttachment(attachment.url));
                    });
                    msgContent = randomMsg.content;
                }
                // GET RID OF ANY PINGS FROM THE CONTENT

                msgContent = msgContent.split("@").join("[at]");
                // let matches = msgContent.match(/^<@!?(\d+)>$/);
                // console.log(msgContent);
                // console.log(matches);
                await message.channel.send(`\ ${msgContent}`, attachmentList);
            } else {
                console.error('NO RANDOM MSG');
                console.log(`size: ${messagesArray.length} | index: ${randomIndex}`);
                await message.channel.send('there was a missing bruh bug... bruh');
            }
        } else {
            await message.channel.send(`No Bruh Channels have been set!`);
        }
    } catch (e) {
        console.error(e);
        await message.channel.send('there was a bruh bug... bruhhhhhhh');
    }
}

export async function setBruhCmd(client: Client, args: string[], message: Message) {
    // Admin only
    if (!isAdmin(message)) {
        await message.channel.send(`This command requires administrator permissions.`);
        return;
    }

    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }

    if (!isGuildRegistered(guildId)) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }

    if (args.length === 0) {
        let channelString = "";
        if (gRegistry[guildId] && gRegistry[guildId].bruhChannels && gRegistry[guildId].bruhChannels.length > 0) {
            gRegistry[guildId].bruhChannels.forEach((channelId: string) => {
                channelString += `<#${channelId}> `;
            });
            await message.channel.send(`Bruh Channel: ${channelString}`);
        } else {
            await message.channel.send(`No bruh Channels have been set!`);
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
            let guild = gRegistry[guildId];
            if (guild && guild.bruhChannels && guild.bruhChannels.includes(channelId)) {
                guild.bruhChannels.splice(guild.bruhChannels.indexOf(channelId), 1);
                await updateGuildsJson(message);
                await message.channel.send(`Removed ${rawChannelId} from the bruh channels list!`);
            } else {
                if (!guild.bruhChannels) {
                    guild.bruhChannels = [];
                }
                guild.bruhChannels.push(channelId);
                await updateGuildsJson(message);
                await message.channel.send(`Added ${rawChannelId} to the bruh channels list!`);
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

    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }

    if (!isGuildRegistered(guildId)) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }

    let guild = gRegistry[guildId];
    if (args.length === 0) {
        let channelString = "";
        if (guild && guild.dotwChannels && guild.dotwChannels.length > 0) {
            guild.dotwChannels.forEach((channelId: string) => {
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
            if (guild && guild.dotwChannels && guild.dotwChannels.includes(channelId)) {
                guild.dotwChannels = [];
                await updateGuildsJson(message);
                await message.channel.send(`Removed ${rawChannelId} as the Day of the Week Channel!`);
            } else {
                if (!guild.dotwChannels) {
                    guild.dotwChannels = [];
                }
                guild.dotwChannels = [channelId];
                await updateGuildsJson(message);
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

    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }

    if (!isGuildRegistered(guildId)) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }

    let guild = gRegistry[guildId];
    if (args.length === 0) {
        let channelString = "";
        if (guild && guild.vcChannelPairs && guild.vcChannelPairs.length > 0) {
            guild.vcChannelPairs.forEach((channelIdPair: string[]) => {
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
        if (guild && guild.vcChannelPairs && guild.vcChannelPairs.length > 0) {
            for (const presentPair of guild.vcChannelPairs) {
               if (presentPair[0] === pair[0] && presentPair[1] === pair[1]) {
                   guild.vcChannelPairs.splice(guild.vcChannelPairs.indexOf(pair), 1);
                   await updateGuildsJson(message);
                   await message.channel.send(`Removed ${pair} from VC Channels list!`);
                   return;
               }
            }
        } else {
            if (!guild.vcChannelPairs) {
                guild.vcChannelPairs = [];
            }
        }
        guild.vcChannelPairs.push(pair);
        await updateGuildsJson(message);
        await message.channel.send(`Added ${pair} to the VC Channels list!`);
    } else {
        await message.channel.send(`Requires exactly two arguments, a voice channel id, and a text channel mention. You gave ${args}`);

    }
}