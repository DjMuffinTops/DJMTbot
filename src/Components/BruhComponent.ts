import {
    GuildMember,
    Message,
    AttachmentBuilder,
    MessageReaction,
    TextChannel,
    User,
    VoiceState,
    Collection,
    FetchMessagesOptions,
    SlashCommandBuilder,
    Interaction,
    TextBasedChannel,
    ChannelType,
    ChatInputCommandInteraction,
    PermissionFlagsBits
} from "discord.js";
import { Component } from "../Component";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { isInteractionAdmin } from "../HelperFunctions";
import { ComponentNames } from "../Constants/ComponentNames";

const bruhCommand = new SlashCommandBuilder();
bruhCommand.setName(ComponentCommands.BRUH);
bruhCommand.setDescription("Get a bruh from the bruh channel")

const setBruhCommmand = new SlashCommandBuilder();
setBruhCommmand.setName(ComponentCommands.SET_BRUH);
setBruhCommmand.setDescription("Sets the bruh channel");
setBruhCommmand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the bruh channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setBruhCommmand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printBruhCommand = new SlashCommandBuilder();
printBruhCommand.setName(ComponentCommands.PRINT_BRUH);
printBruhCommand.setDescription("Prints bruh information");
printBruhCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const recacheBruh = new SlashCommandBuilder();
recacheBruh.setName(ComponentCommands.BRUH_RECACHE);
recacheBruh.setDescription("Recaches all of the bruh messages in the bruh channel");
recacheBruh.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface BruhComponentSave {
    bruhChannels: string[];
}

export class BruhComponent extends Component<BruhComponentSave> {

    name = ComponentNames.BRUH;
    bruhChannels: string[] = [];
    messageCache: Message[] = [];
    // This is local as its not very important to store
    onCooldown: boolean = false;
    commands: SlashCommandBuilder[] = [bruhCommand, setBruhCommmand, printBruhCommand, recacheBruh];

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
    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.BRUH) {
            await this.bruhCmd(interaction);
        } else if (interaction.commandName === ComponentCommands.SET_BRUH) {
            // Admin only
            if (!isInteractionAdmin(interaction)) {
                await interaction.reply(`This command requires administrator permissions.`);
                return;
            }
            await this.setBruhCmd(interaction.options.getChannel<ChannelType.GuildText>("channel", true), interaction);
            await this.cacheAllBruhMessages(interaction);
        } else if (interaction.commandName === ComponentCommands.PRINT_BRUH) {
            // Admin only
            if (!isInteractionAdmin(interaction)) {
                await interaction.reply(`This command requires administrator permissions.`);
                return;
            }
            await this.printBruhInfo(interaction);
        }
        else if (interaction.commandName === ComponentCommands.BRUH_RECACHE) {
            await interaction.deferReply({ ephemeral: true });
            // Admin only
            if (!isInteractionAdmin(interaction)) {
                await interaction.reply(`This command requires administrator permissions.`);
                return;
            }
            await this.cacheAllBruhMessages(interaction);
        }

    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async setBruhCmd(bruhChannel: TextBasedChannel, interaction: ChatInputCommandInteraction) {
        // Remove the channel if it's already in the list
        if (this.bruhChannels?.includes(bruhChannel.id)) {
            this.bruhChannels.splice(this.bruhChannels.indexOf(bruhChannel.id), 1);
            await this.djmtGuild.saveJSON();
            // await updateConfig(gConfig, message);
            await interaction.reply({ content: `Removed <#${bruhChannel.id}> from the bruh channels list!`, ephemeral: true });
        } else {
            // Push the channelId to the bruhChannels list
            this.bruhChannels.push(bruhChannel.id);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Added <#${bruhChannel.id}> to the bruh channels list!`, ephemeral: true });
        }


    }

    private async printBruhInfo(interaction: ChatInputCommandInteraction) {
        let channelString = "";
        if (this.bruhChannels && this.bruhChannels?.length > 0) {
            this.bruhChannels.forEach((channelId: string) => {
                channelString += `<#${channelId}> `;
            });
            await interaction.reply({ content: `Bruh Channel: ${channelString}`, ephemeral: true });
        } else {
            await interaction.reply({ content: `No Bruh Channels have been set!`, ephemeral: true });
        }
    }

    async sendBruh(interaction: ChatInputCommandInteraction) {
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
                                [...searchMessage.attachments.values()].forEach((attachment) => {
                                    const msgattachment = new AttachmentBuilder(attachment.url);
                                    attachmentList.push(msgattachment);
                                });
                            }
                        }
                        // In the chance there is just an image and its not a floof bot embed (like a link or something) relay the images
                        for (const embed of randomMsg.embeds) {
                            if (embed.data.url) {
                                const attachment = await new AttachmentBuilder(embed.data.url);
                                attachmentList.push(attachment);
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
                    const reply = `${randomMsg.url}\n${msgContent}`;
                    await interaction.reply({ content: reply, files: attachmentList });
                    console.log(`[${this.djmtGuild.guildId}] Bruh returned ${reply}`);
                } else {
                    await interaction.reply({ content: 'Could not find random message.', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: `No Bruh Channels have been set!`, ephemeral: true });
            }
        } catch (e) {
            console.error(`[${this.djmtGuild.guildId}] ${e}`);
            await interaction.reply({ content: 'there was a bruh bug... bruhhhhhhh', ephemeral: true });
        }
    }

    async bruhCmd(interaction: ChatInputCommandInteraction) {
        if (this.onCooldown) {
            await interaction.reply({ content: `Please wait, the bruh command is on cooldown.`, ephemeral: true });
            return;
        }
        this.onCooldown = true;
        setTimeout(async () => {
            this.onCooldown = false;
        }, 2500);
        try {
            await this.sendBruh(interaction);
        } catch (e) {
            console.error(`[${this.djmtGuild.guildId}] ${e}`);
            await interaction.reply({ content: 'there was a bruh bug... bruhhhhhhh', ephemeral: true });
        }
    }

    private async cacheAllBruhMessages(interaction?: ChatInputCommandInteraction) {
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
        if (interaction) {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: `Bruh cache is ready with ${this.messageCache.length} bruhs`, ephemeral: true });
            } else {
                await interaction.reply({ content: `Bruh cache is ready with ${this.messageCache.length} bruhs`, ephemeral: true });
            }
        }
        console.log(`[${this.djmtGuild.guildId}] Bruh cache size: ${this.messageCache.length}`);
    }

}
