import {
    Channel,
    GuildMember,
    Message, MessageAttachment,
    MessageReaction,
    TextChannel,
    User,
    VoiceState
} from "discord.js";
import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {CommandStrings} from "../../commands/CommandStrings";
import {getConfig, updateConfig} from "../../commands/config";
import {isAdmin} from "../../commands/helper";

export class BruhCommand extends Component{
    // This is local as its not very important to store
    onCooldown: boolean = false;


    async cron(cron: Cron): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessage(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.BRUH) {
            await this.bruhCmd(args, message);
        } else if (command === CommandStrings.SET_BRUH) {
            await this.setBruhCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async setBruhCmd(args: string[], message: Message) {
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
                    const foundChannel = await this.guild.client.channels.fetch(channelId);
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

    async sendBruh(message: Message) {
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
                                const foundChannel = (await this.guild.client.channels.fetch(channelId) as TextChannel);
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

    async bruhCmd(args: string[], message: Message) {
        const gConfig = await getConfig(message);
        if (!gConfig.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
            return;
        }

        if (this.onCooldown) {
            await message.channel.send(`Please wait, the bruh command is on cooldown.`);
        } else {
            this.onCooldown = true;
            setTimeout(async () => {
                this.onCooldown = false;
            }, 2500);
        }
        const count: number = Number(args[0]);
        await this.sendBruh(message);
        if (Number.isInteger(count) && count === 2) {
            await this.sendBruh(message);
        }
    }
}
