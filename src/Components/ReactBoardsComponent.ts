import { Component } from "../Component";
import {
    Channel,
    GuildMember,
    Message,
    AttachmentBuilder, EmbedBuilder,
    MessageReaction, TextChannel,
    User,
    VoiceState,
    ChannelType,
    Interaction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChatInputCommandInteraction
} from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { isMessageAdmin } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { DJMTbot } from "../DJMTbot";

const setAutoReactCommand = new SlashCommandBuilder();
setAutoReactCommand.setName(ComponentCommands.SET_AUTO_REACT);
setAutoReactCommand.setDescription("Sets the auto react channel for a given emote");
setAutoReactCommand.addStringOption(input => input.setName("emote").setDescription("The emote to add or remove from the auto react list").setRequired(true));
setAutoReactCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the auto react list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setAutoReactCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printAutoReactCommand = new SlashCommandBuilder();
printAutoReactCommand.setName(ComponentCommands.PRINT_AUTO_REACT);
printAutoReactCommand.setDescription("Prints the auto react channels");
printAutoReactCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setReactPairsCommand = new SlashCommandBuilder();
setReactPairsCommand.setName(ComponentCommands.SET_REACT_PAIRS);
setReactPairsCommand.setDescription("Sets the react pair for a given emote, setting the threshold for the react to be sent to the channel");
setReactPairsCommand.addStringOption(input => input.setName("emote").setDescription("The emote to add or remove from the react channels list").setRequired(true));
setReactPairsCommand.addChannelOption(input => input.setName("channel").setDescription("The destination channel to add or remove from the react channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setReactPairsCommand.addIntegerOption(input => input.setName("threshold").setDescription("The number of reacts required to send the message to the channel").setRequired(true));

const printReactPairsCommand = new SlashCommandBuilder();
printReactPairsCommand.setName(ComponentCommands.PRINT_REACT_PAIRS);
printReactPairsCommand.setDescription("Prints the react channels");
printReactPairsCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setStarCommand = new SlashCommandBuilder();
setStarCommand.setName(ComponentCommands.SET_STAR);
setStarCommand.setDescription("Sets auto star reacts for a given channel");
setStarCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the star channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setStarCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printStarCommand = new SlashCommandBuilder();
printStarCommand.setName(ComponentCommands.PRINT_STAR);
printStarCommand.setDescription("Prints the star channels");
printStarCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Declare data you want to save in JSON here
interface ReactBoardSave {
    emoteReactBoardMap: Map<string, ReactBoardMapValue>,
    autoReactMap: Map<string, string[]>
    starChannels: string[];
}

interface ReactBoardMapValue {
    threshold: number;
    channelId: string;
    recentMsgIds: string[];
}

export class ReactBoardsComponent extends Component<ReactBoardSave> {

    name: ComponentNames = ComponentNames.REACT_BOARDS;
    emoteReactBoardMap: Map<string, ReactBoardMapValue> = new Map();
    autoReactMap: Map<string, string[]> = new Map();
    starChannels: string[] = [];
    commands: SlashCommandBuilder[] = [setAutoReactCommand, printAutoReactCommand, setReactPairsCommand, printReactPairsCommand, setStarCommand, printStarCommand];

    async getSaveData(): Promise<ReactBoardSave> {
        const clearedERMap = new Map(this.emoteReactBoardMap);
        // recentMsgIds do not need to be saved
        for (const key of Array.from(clearedERMap.keys())) {
            // @ts-ignore
            clearedERMap.get(key).recentMsgIds = [];
        }
        return {
            emoteReactBoardMap: this.emoteReactBoardMap,
            autoReactMap: this.autoReactMap,
            starChannels: this.starChannels
        };
    }

    async afterLoadJSON(loadedObject: ReactBoardSave | undefined): Promise<void> {
        if (loadedObject) {
            this.emoteReactBoardMap = loadedObject.emoteReactBoardMap;
            this.autoReactMap = loadedObject.autoReactMap;
            this.starChannels = loadedObject.starChannels;
        }
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        await this.autoStar(args, message);
        await this.checkAutoReact(args, message);
        return Promise.resolve(undefined);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        await this.checkReactBoard(messageReaction);
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.SET_AUTO_REACT) {
            await this.setAutoReactCmd(interaction.options.getString("emote", true), interaction.options.getChannel<ChannelType.GuildText>("channel", true) as TextChannel, interaction);
        } else if (interaction.commandName === ComponentCommands.PRINT_AUTO_REACT) {
            await this.printAutoReactCmd(interaction);
        } else if (interaction.commandName === ComponentCommands.SET_REACT_PAIRS) {
            await this.setReactPairsCmd(interaction.options.getString("emote", true), interaction.options.getChannel<ChannelType.GuildText>("channel", true) as TextChannel, interaction.options.getInteger("threshold", true), interaction);
        } else if (interaction.commandName === ComponentCommands.PRINT_REACT_PAIRS) {
            await this.printReactPairsCmd(interaction);
        } else if (interaction.commandName === ComponentCommands.SET_STAR) {
            await this.setStarCmd(interaction.options.getChannel<ChannelType.GuildText>("channel", true) as TextChannel, interaction);
        } else if (interaction.commandName === ComponentCommands.PRINT_STAR) {
            await this.printStartCmd(interaction);
        }
        return Promise.resolve(undefined);
    }

    async printAutoReactCmd(interaction: ChatInputCommandInteraction) {
        let msg = "";
        if (this.autoReactMap.size > 0) {
            let msg = '';
            this.autoReactMap.forEach((channelIds, rawEmojiId) => {
                channelIds.forEach(channelId => {
                    msg += `${rawEmojiId} => <#${channelId}>\n`;
                });
            });
            await interaction.reply(`Auto React Channels:\n${msg}`);
        } else {
            await interaction.reply(`No Auto React Channels have been set!`);
        }
    }

    async setAutoReactCmd(rawEmote: string, channel: TextChannel, interaction: ChatInputCommandInteraction) {
        let emoteId = rawEmote.substring(rawEmote.lastIndexOf(':') + 1, rawEmote.indexOf('>'));
        let foundEmote = undefined;
        foundEmote = DJMTbot.getInstance().client.emojis.cache.get(emoteId);
        if (!foundEmote) {
            await interaction.reply(`The given emote could not be found, make sure this bot in is the server the emote is from!`);
            return;
        }
        let channelId = channel.id
        const foundChannel = this.djmtGuild.getGuildChannel(channelId);
        if (!foundChannel) {
            await interaction.reply("The given channel is invalid!");
            return;
        }
        if (this.autoReactMap.has(rawEmote)) {
            if (this.autoReactMap.get(rawEmote)?.includes(channelId)) {
                // If we have a match delete it from the map
                // @ts-ignore
                this.autoReactMap.get(rawEmote).splice(this.autoReactMap.get(rawEmote).indexOf(channelId), 1);
                // @ts-ignore
                if (this.autoReactMap.get(rawEmote).length < 1) {
                    this.autoReactMap.delete(rawEmote)
                }
                await this.djmtGuild.saveJSON();
                await interaction.reply(`Removed ${channel} from the auto react list for ${rawEmote}`);
            } else {
                this.autoReactMap.get(rawEmote)?.push(channelId);
                await this.djmtGuild.saveJSON();
                await interaction.reply(`Added ${channel} to the auto react list for ${rawEmote}!`);
            }
        } else {
            this.autoReactMap.set(rawEmote, [channelId]);
            await this.djmtGuild.saveJSON();
            await interaction.reply(`Added ${channel} to the auto react list for ${rawEmote}!`);
        }
    }

    async printReactPairsCmd(interaction: ChatInputCommandInteraction) {
        if (this.emoteReactBoardMap.size > 0) {
            let msg = '';
            this.emoteReactBoardMap.forEach((value, key) => {
                const emoteId = key.substring(key.lastIndexOf(':') + 1, key.indexOf('>'));
                const emoji = DJMTbot.getInstance().client.emojis.cache.get(emoteId);
                msg += `${emoji?.toString()} => <#${value.channelId}> (threshold: ${value.threshold})\n`;
            });
            await interaction.reply(`React Channels:\n${msg}`);
        } else {
            await interaction.reply(`No React Channel Pairs have been set!`);
        }
    }

    async setReactPairsCmd(rawEmote: string, channel: TextChannel, threshold: number, interaction: ChatInputCommandInteraction) {
        let emoteId = rawEmote.substring(rawEmote.lastIndexOf(':') + 1, rawEmote.indexOf('>'));
        let channelId = channel.id;
        let foundEmote = DJMTbot.getInstance().client.emojis.cache.get(emoteId);
        let foundTextChannel = this.djmtGuild.getGuildChannel(channelId);
        if (!foundEmote || !foundTextChannel) {
            await interaction.reply("The given channel or emote is invalid!");
            return;
        }
        if (foundTextChannel.type !== ChannelType.GuildText) {
            await interaction.reply(`The given channel is not a Text Channel`);
            return;
        }
        if (this.emoteReactBoardMap.has(rawEmote) &&
            this.emoteReactBoardMap.get(rawEmote)?.channelId === channelId) {
            // @ts-ignore
            const val: ReactBoardMapValue = this.emoteReactBoardMap.get(rawEmote);
            // If we have a match delete it from the map and the config
            this.emoteReactBoardMap.delete(rawEmote);

            await this.djmtGuild.saveJSON();
            await interaction.reply(`Removed [${rawEmote}, ${val.channelId}, ${val.threshold}] from React Channels list!`);
            return;

        } else if (this.emoteReactBoardMap.has(rawEmote)) {
            await interaction.reply(`A pair for this emote already exists! Remove that pair first.`);
        } else {
            const reactBoardMapValue: ReactBoardMapValue = { // For our map, add in an empty array for recent msgs
                threshold: threshold,
                channelId: channelId,
                recentMsgIds: [],
            }
            this.emoteReactBoardMap.set(rawEmote, reactBoardMapValue);
            await this.djmtGuild.saveJSON();
            await interaction.reply(`Added ${rawEmote} => <#${channelId}> to the React Channels list (threshold ${threshold})!`);
        }
    }

    async checkAutoReact(args: string[], message: Message) {
        let channelId = message.channel.id;
        this.autoReactMap.forEach((channelIds, rawEmojiId) => {
            const emoteId = rawEmojiId.substring(rawEmojiId.lastIndexOf(':') + 1, rawEmojiId.indexOf('>'));
            const foundEmote = DJMTbot.getInstance().client.emojis.cache.get(emoteId);
            channelIds.forEach(async mapChannelId => { // TODO: async might be weird here
                if (foundEmote && channelId === mapChannelId) {
                    try {
                        await message.react(foundEmote);
                    } catch (e) {
                        if (e instanceof Error && e.message === 'Unknown Message') {
                            console.log(`[${this.djmtGuild.guildId}] checkAutoReact Unknown message error, message was probably already deleted`);
                        } else {
                            console.log(`[${this.djmtGuild.guildId}] checkAutoReact error: ${e}`);
                        }
                    }
                }
            });
        });
    }
    async checkReactBoard(reaction: MessageReaction) {
        // let channelId = reaction.message.channel.id;
        const rawEmoteId = reaction.emoji.toString();
        if (rawEmoteId && this.emoteReactBoardMap.has(rawEmoteId) &&
            !this.emoteReactBoardMap?.get(rawEmoteId)?.recentMsgIds?.includes(reaction.message.id)) {
            const reactMapValue = this.emoteReactBoardMap.get(rawEmoteId);
            if (reaction.count === reactMapValue?.threshold && reactMapValue?.channelId) {
                const message = await reaction.message.fetch();
                const destinationChannel = this.djmtGuild.getGuildChannel(reactMapValue.channelId) as TextChannel;
                const embed = new EmbedBuilder();
                let msgAttachments = [...message.attachments.values()];
                embed.setDescription(`[Original Message](${message.url})`)
                    .setColor(16755763)
                    .setTimestamp(message.createdAt)
                    .addFields(
                        { name: 'Channel', value: message.channel.toString(), inline: true },
                        { name: 'Message', value: message.content || '\u200b', inline: true },
                        { name: 'Media URL', value: message.attachments.first()?.url || '\u200b', inline: false })
                    .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
                    .setImage(msgAttachments.length > 0 ? msgAttachments[0].url : '')
                    .setAuthor({ name: `${message.author.username}#${message.author.discriminator} (${message.author.id})`, iconURL: message.author.displayAvatarURL({ size: 128 }) })
                    .setFooter({ text: `${reaction.count} ⭐ | ${message.id}` });
                try {
                    await destinationChannel.send({ embeds: [embed] });
                } catch (e) {
                    console.error(e);
                    console.error(`[${this.djmtGuild.guildId}] Could not set starboard message for ${message.url}`);

                }
                this.emoteReactBoardMap?.get(rawEmoteId)?.recentMsgIds?.push(message.id);
                // We dont care about recent msg ids being saved to file, so dont save here.
            }
        }
    }

    async printStartCmd(interaction: ChatInputCommandInteraction) {
        let channelString = "";
        if (this.starChannels?.length > 0) {
            this.starChannels.forEach((channelId: string) => {
                channelString += `<#${channelId}> `;
            });
            await interaction.reply(`Star Channels: ${channelString}`);
        } else {
            await interaction.reply(`No Star Channels have been set!`);
        }
    }

    async setStarCmd(channel: TextChannel, interaction: ChatInputCommandInteraction) {
        let channelId = channel.id;
        const foundChannel = await this.djmtGuild.getGuildChannel(channelId);
        if (!foundChannel) {
            await interaction.reply("The given channel is invalid!");
            return;
        }
        if (this.starChannels?.includes(channelId)) {
            this.starChannels.splice(this.starChannels.indexOf(channelId), 1);
            await this.djmtGuild.saveJSON();
            await interaction.reply(`Removed ${channel} from the star channels list!`);
        } else {
            if (!this.starChannels) {
                this.starChannels = [];
            }
            this.starChannels.push(channelId);
            await this.djmtGuild.saveJSON();
            await interaction.reply(`Added ${channel} to the star channels list!`);
        }

    }

    async autoStar(args: string[], message: Message) {
        let channelId = message.channel.id;
        if (this.starChannels?.includes(channelId)) {
            try {
                await message.react('⭐');
            } catch (e) {
                if (e instanceof Error && e.message === 'Unknown Message') {
                    console.log(`[${this.djmtGuild.guildId}] autoStar Unknown message error, message was probably already deleted`);
                } else {
                    console.log(`[${this.djmtGuild.guildId}] autoStar error: ${e}`);
                }
            }
        }
    }
}

