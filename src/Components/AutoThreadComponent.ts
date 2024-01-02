import { Component } from "../Component";
import {
    ChannelType,
    ChatInputCommandInteraction,
    GuildMember,
    Interaction,
    Message,
    MessageReaction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    User,
    VoiceState
} from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { isInteractionAdmin, mapKeys } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const setAutoThreadCommand = new SlashCommandBuilder();
setAutoThreadCommand.setName(ComponentCommands.SET_AUTO_THREAD);
setAutoThreadCommand.setDescription("Adds or removes a channel from the auto thread channel list.");
setAutoThreadCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove").addChannelTypes(ChannelType.GuildText).setRequired(true));
setAutoThreadCommand.addStringOption(input => input.setName("prefix").setDescription("The prefix to infront of the genearated thread names").setRequired(true));
setAutoThreadCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printAutoThreadCommand = new SlashCommandBuilder();
printAutoThreadCommand.setName(ComponentCommands.PRINT_AUTO_THREAD);
printAutoThreadCommand.setDescription("Prints the auto thread channel list.");
printAutoThreadCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/**
 * Declare data you want to save in JSON here. This interface is used for getSaveData and
 * afterLoadJSON, as it tells Typescript what data you're expecting to write and load.
 */

interface AutoThreadComponentSave {
    channels: Map<string, AutoThreadEntrySave>;
}
interface AutoThreadEntrySave {
    channel: string;
    namePrefix: string;
}

interface AutoThreadEntry {
    channel: TextChannel;
    namePrefix: string;
}

/**
 * Component that allows for automatic thread generation on every message sent in marked channels.
 * The thread name will be based on the most appropriate information within the message.
 */
export class AutoThreadComponent extends Component<AutoThreadComponentSave> {

    // MANDATORY: Define a name in ComponentNames.ts and place it here.
    name: ComponentNames = ComponentNames.AUTO_THREAD;
    channelsMap: Map<string, AutoThreadEntry> = new Map();
    commands: SlashCommandBuilder[] = [setAutoThreadCommand, printAutoThreadCommand]

    async getSaveData(): Promise<AutoThreadComponentSave> {
        return {
            channels: mapKeys(this.channelsMap, (AutoThreadChannel) => {
                return {
                    channel: AutoThreadChannel.channel.id,
                    namePrefix: AutoThreadChannel.namePrefix,
                }
            })
        };
    }

    async afterLoadJSON(loadedObject: AutoThreadComponentSave | undefined): Promise<void> {
        if (loadedObject) {
            const newMap: Map<string, AutoThreadEntry> = new Map<string, AutoThreadEntry>();
            for (const key of Array.from(loadedObject.channels.keys())) {
                const value: AutoThreadEntrySave | undefined = loadedObject.channels.get(key);
                if (value) {
                    const channel = this.djmtGuild.getGuildChannel(value.channel) as TextChannel;
                    if (!channel || channel.type !== ChannelType.GuildText) {
                        console.error(`[AutoThread]: could not load ${value}`);
                        continue;
                    }
                    const newValue: AutoThreadEntry = {
                        channel: channel,
                        namePrefix: value.namePrefix
                    }
                    newMap.set(key, newValue);
                } else {
                    console.log('[AutoThread]: No loaded value found');
                }
            }
            this.channelsMap = newMap;
        }
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        this.createThread(message);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        await this.updateThread(newMessage);
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
        if (interaction.commandName === ComponentCommands.PRINT_AUTO_THREAD) {
            // Admin only
            if (!isInteractionAdmin(interaction)) {
                await interaction.reply({ content: `This command requires administrator permissions.`, ephemeral: true });
                return;
            }
            await this.printAutoThread(interaction);
        } else if (interaction.commandName === ComponentCommands.SET_AUTO_THREAD) {
            // Admin only
            if (!isInteractionAdmin(interaction)) {
                await interaction.reply({ content: `This command requires administrator permissions.`, ephemeral: true });
                return;
            }
            await this.addOrRemoveChannel(interaction.options.getChannel<ChannelType.GuildText>("channel", true), interaction.options.getString("prefix", true), interaction);
        }
        return Promise.resolve(undefined);
    }

    /**
     * Starts a thread on the given message.
     * @param message The message to start a thread on.
     * @private
     */
    private async createThread(message: Message): Promise<void> {
        // Is this one of the marked channels?
        const entry: AutoThreadEntry | undefined = this.channelsMap.get(message.channel.id);
        if (entry) {
            try {
                const thread = await message.startThread({
                    name: this.extractThreadName(message, entry.namePrefix),
                    autoArchiveDuration: 1440,
                    reason: 'DJMTbot Auto Thread'
                });
            } catch (e) {
                if (e instanceof Error && e.message === 'Unknown Message') {
                    console.log(`[${this.djmtGuild.guildId}] checkAutoThread Unknown message error, message was probably already deleted`);
                }
                else {
                    console.log(`[${this.djmtGuild.guildId}] checkAutoThread error: ${e}`);
                }
            }
        }
    }

    /**
     * Extracts the best name for a thread from a given message.
     * @param message The message to generate a thread name from
     * @param prefix String to append to the front of the thread name
     * @private
     */
    private extractThreadName(message: Message<boolean>, prefix: string): string {
        // Generally prioritize title of embed first, then embed description, then message content, and lastly attachment filename
        const attachments = [...message.attachments.values()];
        const embeds = [...message.embeds.values()];
        let firstEmbedName = embeds.length > 0 ? embeds[0].title ?? embeds[0].description ?? "" : ""; // title before description
        let firstAttachmentName = attachments.length > 0 ? attachments[0].name?.split(".")[0] : "";
        let messageContentName = message.content;
        const coreName = (firstEmbedName || messageContentName || firstAttachmentName);
        return `${prefix}-${message.author.username}${coreName ? `-${coreName}` : ""}`.substring(0, 100);

    }

    /**
     * Updates the thread attached to the given message with a new thread name using the latest message update information.
     * @param message The message have the updated based on.
     * @private
     */
    private async updateThread(message: Message): Promise<void> {
        // Is this one of the marked channels?
        const entry: AutoThreadEntry | undefined = this.channelsMap.get(message.channel.id);
        if (entry) {
            if (message.hasThread && message.thread) {
                const thread = message.thread;
                await thread.edit({
                    name: this.extractThreadName(message, entry.namePrefix),
                });
            }
        }
    }

    /**
     * Sets and removes auto thread channels based on the given message args
     * @param args
     * @param interaction
     * @private
     */
    private async addOrRemoveChannel(textChannel: TextChannel, namePrefix: string, interaction: ChatInputCommandInteraction) {
        namePrefix = namePrefix.trim();
        if (!namePrefix) {
            await interaction.reply({ content: `Prefix must not be empty!`, ephemeral: true });
            return;
        }
        // Remove the channel if it's already in the list
        if (this.channelsMap.get(textChannel.id)) {
            this.channelsMap.delete(textChannel.id);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Removed ${textChannel.toString()} from Auto Thread Channels`, ephemeral: true });
        } else {
            this.channelsMap.set(textChannel.id, {
                channel: textChannel,
                namePrefix: namePrefix
            });
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Added ${textChannel.toString()} to Auto Thread Channels!`, ephemeral: true });
        }

    }

    private async printAutoThread(interaction: ChatInputCommandInteraction) {
        if (this.channelsMap.size <= 0) {
            await interaction.reply({ content: `No Auto Thread Channels have been set!`, ephemeral: true });
        } else {
            let msg = '';
            this.channelsMap.forEach((autoThreadEntry) => {
                msg += `\`channel\`: ${autoThreadEntry.channel}, \`namePrefix\`: ${autoThreadEntry.namePrefix}\n`;
            });
            await interaction.reply({ content: `Auto Thread Channels:\n${msg}`, ephemeral: true });
        }
    }
}
