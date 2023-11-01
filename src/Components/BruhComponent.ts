import {
    Channel,
    GuildMember,
    Message,
    AttachmentBuilder,
    MessageReaction,
    TextChannel,
    User,
    VoiceState,
    Collection,
    FetchMessagesOptions
} from "discord.js";
import { Component } from "../Component";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { isAdmin } from "../HelperFunctions";
import { ComponentNames } from "../Constants/ComponentNames";

interface BruhComponentSave {
    bruhChannels: string[];
}
export class BruhComponent extends Component<BruhComponentSave> {

    name = ComponentNames.BRUH;
    bruhChannels: string[] = [];
    messageCache: Message[] = [];
    // This is local as its not very important to store
    onCooldown: boolean = false;


    async getSaveData(): Promise<BruhComponentSave> {
        return {
            bruhChannels: this.bruhChannels
        };
    }

    async afterLoadJSON(loadedObject: BruhComponentSave | undefined): Promise<void> {
        if (loadedObject) {
            this.bruhChannels = loadedObject.bruhChannels;
        }
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
        await this.cacheAllBruhMessages();
        return Promise.resolve(undefined);
    }
    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
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

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === ComponentCommands.BRUH) {
            await this.bruhCmd(args, message);
        } else if (command === ComponentCommands.SET_BRUH) {
            await this.setBruhCmd(args, message);
            await this.cacheAllBruhMessages(args, message);
        } else if (command === ComponentCommands.BRUH_RECACHE) {
            await this.cacheAllBruhMessages(args, message);
        }
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

        if (args.length === 0) {
            let channelString = "";
            if (this.bruhChannels && this.bruhChannels?.length > 0) {
                this.bruhChannels.forEach((channelId: string) => {
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
                // Test if the channel exists before moving on
                const foundChannel = this.djmtGuild.getGuildChannel(channelId);
                if (!foundChannel) {
                    await message.channel.send("The given channel is invalid!");
                    continue;
                }
                // Remove the channel if it's already in the list
                if (this.bruhChannels?.includes(channelId)) {
                    this.bruhChannels.splice(this.bruhChannels.indexOf(channelId), 1);
                    await this.djmtGuild.saveJSON();
                    // await updateConfig(gConfig, message);
                    await message.channel.send(`Removed ${channelMentionStr} from the bruh channels list!`);
                } else {
                    // Push the channelId to the bruhChannels list
                    this.bruhChannels.push(channelId);
                    await this.djmtGuild.saveJSON();
                    await message.channel.send(`Added ${channelMentionStr} to the bruh channels list!`);
                }
            }
        }
    }

    async sendBruh(message: Message) {
        try {
            let attachmentList: AttachmentBuilder[] = [];
            let msgContent = '';
            if (this.bruhChannels && this.bruhChannels?.length > 0) {

                // let messages = await channel.messages.fetch(); // get the messages
                // let messagesArray = messages.array(); // get it as an array
                let randomIndex = Math.floor(this.messageCache.length * Math.random()); // choose a random message index
                let randomMsg = await this.messageCache[randomIndex]; // get the random message
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
                            const attachment = await new AttachmentBuilder(embed.image.url);
                            attachmentList.push(attachment);
                        }
                        if (embed?.video?.url) {
                            const attachment = await new AttachmentBuilder(embed.video.url);
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
                                const foundChannel = (this.djmtGuild.getGuildChannel(channelId) as TextChannel);
                                searchMessage = await foundChannel.messages.fetch(messageId);
                                msgContent = searchMessage.content;
                                // TODO: if search message isnt found try again with another random message?
                                [...searchMessage.attachments.values()].forEach((attachment) => {
                                    // console.log(attachment);
                                    // do something with the attachment
                                    const msgattachment = new AttachmentBuilder(attachment.url);
                                    attachmentList.push(msgattachment);
                                });
                            }
                        }
                    } else {
                        // Its probably a standard message, get the attachments and relay the content
                        [...randomMsg.attachments.values()].forEach((attachment) => {
                            // do something with the attachment
                            attachmentList.push(new AttachmentBuilder(attachment.url));
                        });
                        msgContent = randomMsg.content;
                    }
                    // GET RID OF ANY PINGS FROM THE CONTENT
                    msgContent = msgContent.split("@").join("[at]");
                    // let matches = msgContent.match(/^<@!?(\d+)>$/);
                    // console.log(msgContent);
                    // console.log(matches);
                    // console.log(`size: ${messagesArray.length} | index: ${randomIndex}`);
                    await message.channel.send({ content: `${randomMsg.url}\n${msgContent}`, files: attachmentList });
                } else {
                    console.error('NO RANDOM MSG');
                    console.log(`size: ${this.messageCache.length} | index: ${randomIndex}`);
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
        if (this.onCooldown) {
            await message.channel.send(`Please wait, the bruh command is on cooldown.`);
            return;
        }
        this.onCooldown = true;
        setTimeout(async () => {
            this.onCooldown = false;
        }, 2500);
        const count: number = Number(args[0]);
        await this.sendBruh(message);
        if (Number.isInteger(count) && count === 2) {
            await this.sendBruh(message);
        }
    }

    private async cacheAllBruhMessages(args?: string[], message?: Message) {
        // Admin only
        if (message && !isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        this.messageCache = [];
        for (const bruhChannelId of this.bruhChannels) {
            let channel: TextChannel | undefined = (this.djmtGuild.guild?.channels?.cache?.get(bruhChannelId) as TextChannel); // get the channel object
            let last_id = "";
            let messages: Collection<string, Message> | undefined = undefined;
            do {
                const options: FetchMessagesOptions = {
                    limit: 100,
                    cache: true
                };
                if (last_id.length > 0) {
                    // @ts-ignore
                    options.before = last_id;
                }
                messages = await channel?.messages?.fetch(options);
                let msgArray = messages ? [...messages.values()] : [];
                this.messageCache.push(...msgArray);
                if (msgArray.length > 0) {
                    last_id = msgArray[(msgArray.length - 1)].id;
                }
            } while (messages?.size > 0);
        }
        if (message) {
            message?.channel?.send(`Bruh cache is ready with ${this.messageCache.length} bruhs`);
        }
        console.log(`[${this.djmtGuild.guildId}] Bruh cache size: ${this.messageCache.length}`);
    }

}
