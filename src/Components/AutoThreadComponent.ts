import {Component} from "../Component";
import {
    GuildMember,
    Message,
    MessageReaction,
    TextChannel,
    User,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {channelIdToChannel, isAdmin, mapKeys} from "../HelperFunctions";
import {ComponentCommands} from "../Constants/ComponentCommands";


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
                    if (!channel || channel.type !== "GUILD_TEXT") {
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
        const command = args?.shift()?.toLowerCase() || '';
        // Any interactive commands should be defined in CompoentCommands.ts
        if (command === ComponentCommands.SET_AUTO_THREAD) {
            await this.parseAndSetChannel(args, message);
        }
        return Promise.resolve(undefined);
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
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
                reason: 'DJMTbot Auto Thread',
            });
			} catch (e) {
			if (e instanceof Error && e.message === 'Unknown Message')
            console.log(`[${this.djmtGuild.guildId}] checkAutoThread Unknown message error, message was probably already deleted`);
            else

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
     * @param message
     * @private
     */
    private async parseAndSetChannel(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        // No args: Print out all the marked channels and verification variables
        if (args.length === 0) {
            if (this.channelsMap.size <= 0) {
                await message.channel.send(`No Auto Thread Channels have been set!`);
            } else {
                let msg = '';
                this.channelsMap.forEach((autoThreadEntry) => {
                    msg += `\`channel\`: ${autoThreadEntry.channel}, \`namePrefix\`: ${autoThreadEntry.namePrefix}\n`;
                });
                await message.channel.send(`Auto Thread Channels:\n${msg}`);
            }
            // Shortcut for removing marked channels: Expects a single channel mention
        } else if (args.length === 2) {
            try {
                const channelMention = args[0];
                const namePrefix = args[1] ?? "";
                // Get the ID from the mention
                const textChannel = await channelIdToChannel(channelMention);
                if (!textChannel) {
                    await message.channel.send("The given channel is invalid!");
                    return;
                }
                if (textChannel.type !== "GUILD_TEXT") {
                    await message.channel.send("The given channel is not a text channel!");
                    return;
                }
                // Remove the channel if it's already in the list
                if (this.channelsMap.get(textChannel.id)) {
                    this.channelsMap.delete(textChannel.id);
                    await this.djmtGuild.saveJSON();
                    await message.channel.send(`Removed ${textChannel.toString()} from Auto Thread Channels`);
                } else {
                    this.channelsMap.set(textChannel.id, {
                        channel: textChannel,
                        namePrefix: namePrefix
                    });
                    await this.djmtGuild.saveJSON();
                    await message.channel.send(`Added ${textChannel.toString()} to Auto Thread Channels!`);                    }
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                return;
            }
        } else {
            await message.channel.send(`Requires exactly two arguments, the text channel mention, and a string to prefix the thread name with. You gave ${args}`);
        }
    }
}
