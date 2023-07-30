import { Component } from "../Component";
import {
    Channel,
    ChannelType,
    GuildMember,
    Message,
    MessageReaction,
    User,
    VoiceChannel,
    VoiceState
} from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { isAdmin } from "../HelperFunctions";

interface DynamicVoiceChannelsSave {
    markedRootVoiceChannelIds: RootDynamicVoiceChannelSave[]
}

interface RootDynamicVoiceChannelSave {
    channelId: string,
    maxChildren: number
}

interface DynamicVoiceChannelNameInfo {
    name: string,
    count: number,
    nameWithoutCount: string,
    possibleChildrenNames: string[]
}

interface DynamicVoiceChannel extends VoiceChannel {
    parentChannel: DynamicVoiceChannel | undefined
    childChannel: DynamicVoiceChannel | undefined
    root: boolean
    rootsMaxChildren: number,
}
/**
 * Component that generate extra voice channels for marked channels when they are occupied.
 * When a marked channel is occupied by at least one user, it generate a duplicate voice channel
 * (denoted by a number at the end of its name). If that channel has a user in it, it will generate
 * another, and so forth until the maxChildren threshold is reached. An extra channel deletes itself
 * when it's parent channel has no users in it and the channel itself has no users in it.
 */
export class DynamicVoiceChannels extends Component<DynamicVoiceChannelsSave> {

    name: ComponentNames = ComponentNames.DYNAMIC_VOICE_CHANNELS;
    markedVoiceChannels: DynamicVoiceChannel[] = [];
    private readonly GUILD_MAXIMUM_GENERATED_CHANNELS = 7;
    private readonly MINIMUM_NUMBER_OF_OCCUPANTS = 7;
    creatingChannel: Map<string, boolean> = new Map();

    async getSaveData(): Promise<DynamicVoiceChannelsSave> {
        return {
            markedRootVoiceChannelIds: this.markedVoiceChannels.filter(markedVC => markedVC.root).map(rootVC => {
                const result: RootDynamicVoiceChannelSave = {
                    channelId: rootVC.id,
                    maxChildren: rootVC.rootsMaxChildren
                };
                return result;
            })
        };
    }

    async afterLoadJSON(loadedObject: DynamicVoiceChannelsSave | undefined): Promise<void> {
        if (loadedObject) {
            this.markedVoiceChannels = loadedObject.markedRootVoiceChannelIds.map(rootChannelSave => {
                const voiceChannel: DynamicVoiceChannel = this.djmtGuild.getGuildChannel(rootChannelSave.channelId) as DynamicVoiceChannel;
                if (voiceChannel) {
                    voiceChannel.root = true;
                    voiceChannel.rootsMaxChildren = rootChannelSave.maxChildren
                    voiceChannel.parentChannel = undefined;
                    voiceChannel.childChannel = undefined;
                }
                return voiceChannel;
            }).filter(dynamicChannel => dynamicChannel);
        }
    }

    async onReady(): Promise<void> {
        // Check if any leftover child channels exist for all marked root channels
        const rootLength = this.markedVoiceChannels.length; // We add to the end of this list add as we go, so get the original length to prevent infinite loop
        for (let i = 0; i < rootLength; i++) { // Loop over the original length
            let rootVC = this.markedVoiceChannels[i];
            // Get the number at the end of the marked channel
            const rootVCInfo = this.getDynamicVoiceChannelInfo(rootVC);
            // Iterate through all channels in this guild, and see if any are named after the possible children
            const allGuildChannels = this.djmtGuild.guild?.channels;
            if (!allGuildChannels) {
                console.log(`[${this.djmtGuild.guildId}]: Could not retrieve all channels for Dynamic Voice Channels component.`)
                return;
            }
            const allGuildVoiceChannels: VoiceChannel[] = [...allGuildChannels.cache.filter(channel => channel.type === ChannelType.GuildVoice).values()] as VoiceChannel[] ?? [];
            // Delete Children that mightve been left over first
            for (const guildVoiceChannel of allGuildVoiceChannels) {
                // Search for existing child channels with each possible child name
                for (let nameIndex = 0; nameIndex < rootVCInfo.possibleChildrenNames.length; nameIndex++) {
                    let childVCName = rootVCInfo.possibleChildrenNames[nameIndex];
                    // If we find a channel with the name of a child channel we expect, delete it if its empty, or attempt to 'rewire' it
                    if (childVCName === guildVoiceChannel.name) {
                        // Delete
                        if (guildVoiceChannel.members.size === 0) {
                            try {
                                await guildVoiceChannel.delete(`${guildVoiceChannel.name} is empty`);
                                console.log(`[${this.djmtGuild.guildId}] Deleted detected child ${guildVoiceChannel.name} ${guildVoiceChannel.id}. VC was empty`);
                            } catch (e) {
                                console.error(`[${this.djmtGuild.guildId}] Error deleting child voice channel ${guildVoiceChannel.name} ${guildVoiceChannel.id}: ${e}`);
                            }
                            continue;
                        }
                        try {
                            // Keep it and add it to marked voice channel by 'rewiring' it's parent and child if they exist
                            let newRootDynamicChannel = guildVoiceChannel as DynamicVoiceChannel;
                            newRootDynamicChannel.root = false;
                            newRootDynamicChannel.parentChannel = this.markedVoiceChannels.find(voiceChannel => voiceChannel.name === rootVCInfo.possibleChildrenNames[nameIndex - 1]) as DynamicVoiceChannel;
                            newRootDynamicChannel.childChannel = this.markedVoiceChannels.find(voiceChannel => voiceChannel.name === rootVCInfo.possibleChildrenNames[nameIndex + 1]) as DynamicVoiceChannel;
                            newRootDynamicChannel.rootsMaxChildren = rootVC.rootsMaxChildren;
                            this.markedVoiceChannels.push(newRootDynamicChannel);
                        } catch (e) {
                            console.log(`[${this.djmtGuild.guildId}] Caught error rewiring on ready. ${e}`);
                        }
                    }
                }
            }
            // Finally check if we need to create any children
            await this.markedChannelCreationCheck();
        }
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
        // Any interactive commands should be defined in CompoentCommands.ts
        if (command === ComponentCommands.SET_DYNAMIC_VC) {
            await this.setRootDynamicVoiceChannel(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        // Whenever Voice Channel State Updates for any marked channel
        if (this.markedVoiceChannels.some(markedVC => markedVC.id === oldState.channel?.id || markedVC.id === newState.channel?.id)) {
            await this.markedChannelCreationCheck();
            await this.markedChannelDeletionCheck();
        }
    }



    /**
     * Checks if any of the marked channels need to be deleted.
     * @private
     */
    private async markedChannelDeletionCheck() {
        // Now check for deletion, Since we're removing from the array, loop in reverse to make sure we hit our original items
        for (let i = this.markedVoiceChannels.length - 1; i >= 0; i--) {
            let markedVC = this.markedVoiceChannels[i];
            // Always check if we need to delete empty dynamic channels.
            // Deleting should only be done to channels that aren't root channels and that are empty
            if (!markedVC.root && markedVC.members.size === 0) {
                // Delete if the marked channel is empty and it has no parent
                if (!markedVC.parentChannel) {
                    await this.deleteChildVC(markedVC, `${markedVC.name} is empty`);
                    continue;
                }
                // Delete if the marked channel is empty, and if it has a parent channel with nobody in it
                if (markedVC.parentChannel.members.size === 0) {
                    await this.deleteChildVC(markedVC, `${markedVC.name} and parent channel ${markedVC.parentChannel.name} are empty.`);
                }
            }
        }
    }

    /**
     * Checks if any of the marked channels needs to have a child created for it.
     * Only occupied marked channel should have a child.
     * @private
     */
    private async markedChannelCreationCheck() {
        // Check if we need to create dynamic channel
        const originalLength = this.markedVoiceChannels.length; // We add to the end of this list add as we go, so get the original length to prevent infinite loop
        for (let i = 0; i < originalLength; i++) {
            let markedVC = this.markedVoiceChannels[i];
            // If the channel is occupied and there's no child channel, create one
            if (markedVC.members.size > 0 && !markedVC.childChannel) {
                await this.createChildVC(markedVC);
            }
        }
    }

    /**
     * Command to add or remove a voice channel to be marked as a root dynamic voice channel
     * @param args
     * @param message
     */
    async setRootDynamicVoiceChannel(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (args.length === 0) {
            const rootChannels = this.markedVoiceChannels.filter(markedVC => markedVC.root);
            if (rootChannels.length > 0) {
                let channelString = "";
                rootChannels.forEach((channel: DynamicVoiceChannel) => {
                    channelString += `${channel.toString()} => Max Children: ${channel.rootsMaxChildren}\n`;
                });
                await message.channel.send(`Dynamic Voice Channels:\n${channelString}`);
            } else {
                await message.channel.send(`No Dynamic Voice Channels have been set!`);
            }
        } else if (args.length === 2) {
            const voiceChannelId = args[0]; // Voice channel must be raw due to lack of mention
            const maxChildrenStr = args[1];
            let maxChildren: number;
            try {
                maxChildren = parseInt(maxChildrenStr);
            } catch (e) {
                console.error(e);
                await message.channel.send(`The maximum number of children must be an integer number. Given ${maxChildrenStr}`);
                return;
            }
            // Verify the channel exists
            let channel = this.djmtGuild.getGuildChannel(voiceChannelId);
            if (!channel) {
                await message.channel.send("The given channel is invalid!");
                return;
            }
            // Verify it is a voice channel
            if (channel.type !== ChannelType.GuildVoice) {
                await message.channel.send("The given channel is not a voice channel!");
                return;
            }
            let voiceChannel = channel as VoiceChannel;
            const res = await this.addOrRemoveRootDynamicVoiceChannel(voiceChannel, maxChildren);
            await message.channel.send(res);
        } else {
            await message.channel.send(`Requires exactly two arguments, a voice channel id, and a integer for the maximum amount of child channels. You gave ${args}`);
        }
    }

    /**
     * Attempts to add or remove a root dynamic voice channel from the marked channels list
     * @param voiceChannel The root voice channel to add or remove
     * @param maxChildren The maximum amount of chidlren this voice channel should have
     */
    async addOrRemoveRootDynamicVoiceChannel(voiceChannel: VoiceChannel, maxChildren?: number): Promise<string> {
        const removed = await this.removeRootDynamicVoiceChannel(voiceChannel);
        if (removed) {
            return `Removed ${voiceChannel.toString()} from VC Channels list!`;
        } else {
            if (maxChildren) {
                await this.addRootDynamicVoiceChannel(voiceChannel, maxChildren);
                return `Added ${voiceChannel.toString()}${voiceChannel} to the VC Channels list!`;
            } else {
                return `Adding channel requires an integer for the maximum amount of child channels`;
            }
        }
    }

    /**
     *  Adds a voice channel as a Root dynamic voice channel to the marked voice channels list
     * @param voiceChannel The voice channel to add
     * @param maxChildren The max amount of children channels the root should have
     */
    async addRootDynamicVoiceChannel(voiceChannel: VoiceChannel, maxChildren: number): Promise<void> {
        let newRootDynamicChannel = voiceChannel as DynamicVoiceChannel;
        newRootDynamicChannel.root = true;
        newRootDynamicChannel.parentChannel = undefined;
        newRootDynamicChannel.childChannel = undefined;
        newRootDynamicChannel.rootsMaxChildren = maxChildren;
        this.markedVoiceChannels.push(newRootDynamicChannel);
        await this.djmtGuild.saveJSON();
    }

    /**
     * Removes a Root dynamic voice channel from the marked voice channels list.
     * @param voiceChannel The root voice channel to remove
     */
    async removeRootDynamicVoiceChannel(voiceChannel: VoiceChannel): Promise<boolean> {
        let rootDynamicChannel = voiceChannel as DynamicVoiceChannel;
        for (const rootChannel of this.markedVoiceChannels) {
            if (rootChannel.root && rootChannel.id === rootDynamicChannel.id) {
                this.markedVoiceChannels.splice(this.markedVoiceChannels.indexOf(rootChannel), 1);
                await this.djmtGuild.saveJSON();
                return true;
            }
        }
        return false;
    }


    /**
     * Gets name and count information from a Dynamic Voice Channel
     * @param dvc The dynamic voice channel
     * @private
     */
    private getDynamicVoiceChannelInfo(dvc: DynamicVoiceChannel): DynamicVoiceChannelNameInfo {
        const rootChannelName: string = dvc.name;
        const lastSpaceIndex: number = rootChannelName.lastIndexOf(" "); // The number should be right after the last space
        let rootChannelCount: number = lastSpaceIndex === -1 ? 1 : Number(rootChannelName.substring(lastSpaceIndex)); // Start generating names from this number
        let rootChannelNameWithoutNumber: string;
        if (isNaN(rootChannelCount)) {
            rootChannelCount = 1;
            rootChannelNameWithoutNumber = rootChannelName;
        } else {
            rootChannelNameWithoutNumber = lastSpaceIndex === -1 ? rootChannelName : rootChannelName.substring(0, lastSpaceIndex);
        }
        const possibleChildVCNames: string[] = Array.from(Array(dvc.rootsMaxChildren).keys()).map((x, index) => `${rootChannelNameWithoutNumber} ${index + rootChannelCount + 1}`);
        return {
            count: rootChannelCount,
            name: rootChannelName,
            nameWithoutCount: rootChannelNameWithoutNumber,
            possibleChildrenNames: possibleChildVCNames

        };
    }

    /**
     * Creates a child voice channel for the given dynamic voice channel
     * @param voiceChannel The dynamic voice channel to create a child for
     * @private
     */
    private async createChildVC(voiceChannel: DynamicVoiceChannel) {
        console.log(`[${this.djmtGuild.guildId}] Attempting to create child for ${voiceChannel.name}`);
        const markedChannelInfo = this.getDynamicVoiceChannelInfo(voiceChannel);
        const nextChannelCount = markedChannelInfo.count + 1;
        const nextChannelName: string = `${markedChannelInfo.nameWithoutCount} ${nextChannelCount}`;
        // Don't create if we're already in the process of making this channel
        if (this.creatingChannel.get(nextChannelName)) {
            console.log(`[${this.djmtGuild.guildId}] Not creating, already creating for this channel`);
            return;
        }
        // If max count, don't create a child
        if (markedChannelInfo.count >= (voiceChannel.rootsMaxChildren || this.GUILD_MAXIMUM_GENERATED_CHANNELS)) {
            console.log(`[${this.djmtGuild.guildId}] Did not generate Child VC, at Maximum Child Limit.`);
            return;
        }
        // If one of the marked channels already has the name of our next child. Don't generate a child, fix the child parent connection instead.
        if (this.markedVoiceChannels.some(voiceChannel => voiceChannel.name === nextChannelName)) {
            const foundChannel: DynamicVoiceChannel = this.markedVoiceChannels.find(voiceChannel => voiceChannel.name === nextChannelName) as DynamicVoiceChannel;
            voiceChannel.childChannel = foundChannel;
            foundChannel.parentChannel = voiceChannel;
            console.log(`[${this.djmtGuild.guildId}] Did not generate Child VC, channel with the name ${foundChannel.name} already exists.`);
            return;
        }
        // Mark that we're creating this child, this is to prevent duplicate creation
        this.creatingChannel.set(nextChannelName, true);
        let childVoiceChannel: DynamicVoiceChannel = (await this.djmtGuild.guild?.channels.create({
            name: nextChannelName ?? "Extra",
            type: ChannelType.GuildVoice,
            parent: voiceChannel.parent ?? undefined, reason: `Dynamic Voice Channel created for ${markedChannelInfo.name}`
        })) as DynamicVoiceChannel;
        // Wire up the child channel
        childVoiceChannel.parentChannel = voiceChannel;
        childVoiceChannel.childChannel = undefined;
        childVoiceChannel.rootsMaxChildren = voiceChannel.rootsMaxChildren;
        childVoiceChannel.root = false;
        await childVoiceChannel.permissionOverwrites.set(voiceChannel.permissionOverwrites.cache);
        await childVoiceChannel.setPosition(voiceChannel.position + 1);
        await childVoiceChannel.setUserLimit((childVoiceChannel.rootsMaxChildren - nextChannelCount) + this.MINIMUM_NUMBER_OF_OCCUPANTS);
        voiceChannel.childChannel = childVoiceChannel;
        this.markedVoiceChannels.push(childVoiceChannel); // add to the end of the list
        console.log(`[${this.djmtGuild.guildId}] Generated child VC ${childVoiceChannel.name} ${childVoiceChannel.id}`);
        this.creatingChannel.set(nextChannelName, false);
    }


    /**
     * Deletes a given child dynamic voice channel. Will not delete root channels.
     * @param voiceChannel The dynamic voice channel to delete
     * @param reason
     * @private
     */
    private async deleteChildVC(voiceChannel: DynamicVoiceChannel, reason?: string) {
        if (voiceChannel.root) {
            console.log(`[${this.djmtGuild.guildId}] Attempted to delete a root DynamicVoiceChannel. skipping`);
            return
        }
        // Set our parent's child to undefined since we're deleting
        if (voiceChannel.parentChannel) {
            voiceChannel.parentChannel.childChannel = undefined;
        }

        // Set the child's parent to undefined since we're deleting
        if (voiceChannel.childChannel) {
            voiceChannel.childChannel.parentChannel = undefined;
        }

        // Delete it from the marked voice channels array
        this.markedVoiceChannels.splice(this.markedVoiceChannels.indexOf(voiceChannel), 1);
        try {
            await voiceChannel.delete(reason);
            console.log(`[${this.djmtGuild.guildId}] Deleted ${voiceChannel.name} ${voiceChannel.id}`);
        } catch (e) {
            console.error(`[${this.djmtGuild.guildId}] Error deleting voice channel ${voiceChannel.name} ${voiceChannel.id}: ${e}`);
        }
    }
}
