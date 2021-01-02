import {Client, Message, MessageAttachment, TextChannel} from "discord.js";
import {getConfig} from "./config";
// This is local as its not very important to store
let bruhCooldowns: any = {};

async function sendBruh(message: Message, client: Client) {
    let guildId = message?.guild?.id;
    if (!guildId) {
        console.log('No guild Id found');
        return;
    }

    const gConfig = await getConfig(message);
    if (!gConfig.registered) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    let register = gConfig.register;
    try {
        let attachmentList = [];
        let msgContent = '';
        if (register?.bruhChannels?.length > 0) {
            let bruhChannelId = register.bruhChannels[Math.floor(register.bruhChannels.length * Math.random())]; // pick a random bruh channel id
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
            let randomMsg = await messagesArray[randomIndex]; // get the random message
            if (randomMsg) {
                // If theres an embed, its probably a floof bot star embed
                if (randomMsg.embeds && randomMsg.embeds.length > 0) {
                    let embed = randomMsg.embeds[0];
                    console.log(embed);
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
                // console.log(`size: ${messagesArray.length} | index: ${randomIndex}`);
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

export async function bruhCmd(client: Client, args: string[], message: Message) {
    const gConfig = await getConfig(message);
    if (!gConfig.registered) {
        await message.channel.send(`Please register your guild to use this command.`);
        return;
    }
    let guildId: string | undefined = message?.guild?.id;
    if (!guildId) {
        console.log('No guild id found');
        return;
    }
    // Make an entry for this guild if its not there
    if (!bruhCooldowns.hasOwnProperty(guildId)) {
        bruhCooldowns[guildId] = false;
    }
    if (bruhCooldowns[guildId]) {
        await message.channel.send(`Please wait, the bruh command is on cooldown.`);
    } else {
        bruhCooldowns[guildId] = true;
        setTimeout(async () => {
            // Removes the user from the set after a minute
            if (guildId) {
                bruhCooldowns[guildId] = false; // TODO: no need to write this to a file
            }
        }, 2500);
    }
    const count: number = Number(args[0]);
    await sendBruh(message, client);
    if (Number.isInteger(count) && count === 2) {
        await sendBruh(message, client);
    }



}
