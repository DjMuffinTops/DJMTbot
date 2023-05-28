import { Component } from "../Component";
import {
    Channel,
    ChannelType,
    GuildMember,
    Interaction,
    Message,
    MessageReaction, TextChannel,
    User,
    VoiceState
} from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import {
    channelIdToChannel, channelMentionToChannelId,
    isMessageAdmin,
    mapKeys,
} from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";
import probe, { ProbeResult } from 'probe-image-size';

/**
 * Declare data you want to save in JSON here. This interface is used for getSaveData and
 * afterLoadJSON, as it tells Typescript what data you're expecting to write and load.
 */
interface PNGResolutionCheckSave {
    channels: Map<string, PNGResolutionEntrySave>;
}

interface PNGResolutionEntrySave {
    channel: string,
    width: number,
    height: number
}

interface PNGResolutionEntry {
    channel: TextChannel,
    width: number,
    height: number
}


/**
 * With check that images in the marked channels are pngs and that they are the correct resolution
 */
export class PNGResolutionCheck extends Component<PNGResolutionCheckSave> {

    name: ComponentNames = ComponentNames.PNG_RESOLUTION_CHECK;
    channelsMap: Map<string, PNGResolutionEntry> = new Map();

    async getSaveData(): Promise<PNGResolutionCheckSave> {
        return {
            channels: mapKeys(this.channelsMap, (PNGResolutionChannel) => {
                return {
                    channel: PNGResolutionChannel.channel.id,
                    width: PNGResolutionChannel.width,
                    height: PNGResolutionChannel.height
                }
            })
        }
    }

    async afterLoadJSON(loadedObject: PNGResolutionCheckSave | undefined): Promise<void> {
        if (loadedObject) {
            const newMap: Map<string, PNGResolutionEntry> = new Map<string, PNGResolutionEntry>();
            for (const key of Array.from(loadedObject.channels.keys())) {
                const value = loadedObject.channels.get(key);
                if (value) {
                    const channel = this.djmtGuild.getGuildChannel(value.channel) as TextChannel;
                    if (!channel) {
                        console.error(`[PNGResolutionCheck]: could not load ${value}`);
                        continue;
                    }
                    const newValue: PNGResolutionEntry = {
                        channel: channel,
                        height: value.height,
                        width: value.width
                    }
                    newMap.set(key, newValue);
                } else {
                    console.log('[PNGResolutionCheck]: No loaded value found');
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
        await this.checkPNGAndResolution(message);
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
        // Any interactive commands should be defined in CompoentCommands.ts
        if (command === ComponentCommands.SET_PNGRC) {
            await this.parseAndSetChannel(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        return Promise.resolve(undefined);
    }

    private async checkPNGAndResolution(message: Message) {
        if (message.attachments.size > 0) {
            // Is this one of the marked channels?
            const entry: PNGResolutionEntry | undefined = this.channelsMap.get(message.channel.id);
            if (entry) {
                // Verify every attachment
                for (const attachment of [...message.attachments.values()]) {
                    let image: ProbeResult;
                    try {
                        image = await probe(attachment.url);
                    } catch (e) {
                        console.error(e);
                        return;
                    }
                    // Verify the image properties
                    if (image) {
                        if (image.type === 'png' && image.width === entry.width && image.height === entry.height) {
                            console.log(`[PNGResolutionCheck]: ${message.id} verified`);
                            await message.react('✅');
                            return;
                        }
                        // Explain to the user why their image was not verified
                        let msg = `${message.author.toString()}, your message has been deleted because:`
                        if (image.type !== 'png') {
                            msg += '\n• Your message is not a .png';
                        }
                        if (image.type === 'png' && (image.width !== entry.width || image.height !== entry.height)) {
                            msg += `\n• Your png has incorrect dimensions.\n      Expected: ${entry.width}px x ${entry.height}px\n      Your image: ${image.width}${image.wUnits} x ${image.height}${image.hUnits}`;
                        }
                        // Delete the message and send a warning.
                        await message.delete();
                        const warningMsg: Message = await message.channel.send(msg);
                        // Delete the warning message after some time
                        setTimeout(async () => {
                            await warningMsg.delete();
                        }, 15000);
                    }
                }
            }
        }
    }

    private async parseAndSetChannel(args: string[], message: Message) {
        // Admin only
        if (!isMessageAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        // No args: Print out all the marked channels and verification variables
        if (args.length === 0) {
            if (this.channelsMap.size <= 0) {
                await message.channel.send(`No PNG Resolution Checking Channels have been set!`);
            } else {
                let msg = '';
                this.channelsMap.forEach((PNGResolutionEntry) => {
                    msg += `<#${PNGResolutionEntry.channel}> : width: ${PNGResolutionEntry.width} height: ${PNGResolutionEntry.height}\n`;
                });
                await message.channel.send(`PNG Resolution Checking Channels:\n${msg}`);
            }
            // Shortcut for removing marked channels: Expects a single channel mention
        } else if (args.length === 1) {
            const channelMention = args[0];
            try {
                const textChannel = await channelIdToChannel(channelMention);
                if (textChannel) {
                    const res = await this.removePNGRCChannel(textChannel as TextChannel);
                    await message.channel.send(res);
                } else {
                    await message.channel.send(`Invalid text channel: ${channelMention}`);
                }
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                return;
            }
            // Warn that this needs exactly 3 args to set
        } else if (args.length !== 3) {
            await message.channel.send(`Requires exactly three arguments, the text channel mention, an integer width, and integer height. You gave ${args}`);
        } else {
            // Parse and verify the message input
            const channelMention = args[0];
            const widthStr = args[1];
            const heightStr = args[2];

            // Verify the width and height are integers
            let width: number;
            let height: number;
            try {
                width = parseInt(widthStr);
                height = parseInt(heightStr);
            } catch (e) {
                console.error(e);
                await message.channel.send(`The width and height must be an integer number. Given ${widthStr} and ${heightStr}`);
                return;
            }

            // Verify the channel exists by fetching it
            let channel: Channel | null;
            try {
                channel = await channelIdToChannel(channelMention);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                return;
            }

            // Verify it is a text channel
            if (channel?.type !== ChannelType.GuildText) {
                await message.channel.send("The given channel is not a text channel!");
                return;
            }
            // Add or remove the PNGRChannel
            let res: string;
            if (this.channelsMap.get(channel.id)) {
                res = await this.removePNGRCChannel(channel as TextChannel);
            } else {
                res = await this.addPNGRCChannel({ channel: channel as TextChannel, width, height });
            }
            await message.channel.send(res);
        }
    }

    /**
     * Marks a channel and its respective width and height requirements for this component to montior.
     * @param entry The channel, width, and height to monitor.
     */
    async addPNGRCChannel(entry: PNGResolutionEntry) {
        this.channelsMap.set(entry.channel.id, {
            channel: entry.channel,
            width: entry.width,
            height: entry.height
        });
        await this.djmtGuild.saveJSON();
        return `Added ${entry.channel.toString()} to PNG Resolution Checking Channels!`;
    }

    /**
     * Removes the marked channel from being tracked by this component.
     * @param channel The channel to no longer track.
     */
    async removePNGRCChannel(channel: TextChannel) {
        if (this.channelsMap.get(channel.id)) {
            this.channelsMap.delete(channel.id);
            await this.djmtGuild.saveJSON();
            return `Removed ${channel.toString()} from PNG Resolution Checking Channels`;
        } else {
            return `${channel.toString()} is not a PNG Resolution Checking Channel`;
        }
    }
}
