import {Component} from "../Component";
import {
    Channel, GuildChannel,
    GuildMember,
    Message,
    MessageReaction, TextChannel,
    User,
    VoiceChannel,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {ComponentCommands} from "../Constants/ComponentCommands";
import {channelIdToChannel, isAdmin} from "../HelperFunctions";
import {VoiceTextPair} from "./VoiceTextPairComponent";

interface DynamicVoiceChannelsSave {
    markedRootVoiceChannelIds: RootDynamicVoiceChannelSave[]
}

interface RootDynamicVoiceChannelSave {
    channelId: string,
    maxChildren: number
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
 * (denoted by a number at the end like VC 2).If that channel has a user in it, generate another,
 * and so forth for a maximum of 5 times. An extra channel deletes itself when the previous channel
 * has no users in it and the channel itself has no users in it.
 */
export class DynamicVoiceChannels extends Component<DynamicVoiceChannelsSave> {

    // MANDATORY: Define a name in ComponentNames.ts and place it here.
    name: ComponentNames = ComponentNames.DYNAMIC_VOICE_CHANNELS;
    markedVoiceChannels: DynamicVoiceChannel[] = [];
    private readonly GUILD_MAXIMUM_GENERATED_CHANNELS = 5;
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
        console.log('READY');
        // Check if any leftover child channels exist for all marked root channels
        const rootLength = this.markedVoiceChannels.length; // We add to this list add we go, so get the original length to prevent infinite loop
        for (let i = 0; i < rootLength; i++){
            let rootVC = this.markedVoiceChannels[i];
            // Get the number at the end of the marked channel
            const rootChannelName: string = rootVC.name;
            const lastSpaceIndex: number = rootChannelName.lastIndexOf(" "); // The number should be right after the last space
            const rootChannelCount: number = lastSpaceIndex === -1 ? 1 : Number(rootChannelName.substring(lastSpaceIndex)); // Start generating names from this number
            const rootChannelNameWithoutNumber: string = lastSpaceIndex === -1 ? rootChannelName : rootChannelName.substring(0, lastSpaceIndex);
            const possibleChildVCNames: string[] = Array.from(Array(rootVC.rootsMaxChildren).keys()).map((x, index) => `${rootChannelNameWithoutNumber} ${index + rootChannelCount}`);
            // console.log(possibleChildVCNames);
            // Iterate through all channels, and see if any are named after the possible children
            const allGuildVoiceChannels: VoiceChannel[] = this.djmtGuild.guild?.channels.cache.filter(channel => channel.type === 'voice').array() as VoiceChannel[] ?? [];
            for (const guildVoiceChannel of allGuildVoiceChannels) {
                // For each possible child name
                for (let nameIndex = 0; nameIndex < possibleChildVCNames.length; nameIndex++) {
                    console.log(`current index: ${nameIndex} = ${possibleChildVCNames[nameIndex]} | ${guildVoiceChannel.name} || ${rootVC.name}`);
                    let childVCName = possibleChildVCNames[nameIndex];
                    // If we find a channel with the name of a child channel we expect
                    if (childVCName === guildVoiceChannel.name) {
                        // console.log(`found leftover child: ${childVCName}`);
                        // Delete
                        if (guildVoiceChannel.members.size === 0) {
                            await guildVoiceChannel.delete(`${guildVoiceChannel.name} is empty`);
                        } else {
                            try {
                                // Keep it and add it to marked voice channel
                                let newRootDynamicChannel = guildVoiceChannel as DynamicVoiceChannel;
                                newRootDynamicChannel.root = false;
                                newRootDynamicChannel.parentChannel = this.markedVoiceChannels.find(voiceChannel => voiceChannel.name === possibleChildVCNames[nameIndex - 1]) as DynamicVoiceChannel;
                                newRootDynamicChannel.childChannel = this.markedVoiceChannels.find(voiceChannel => voiceChannel.name === possibleChildVCNames[nameIndex + 1]) as DynamicVoiceChannel;
                                newRootDynamicChannel.rootsMaxChildren = rootVC.rootsMaxChildren;
                                this.markedVoiceChannels.push(newRootDynamicChannel);
                                // console.log(newRootDynamicChannel);
                            } catch (e) {
                                console.log(e);
                            }

                        }
                    }
                }
            }
        }
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
        // Any interactive commands should be defined in CompoentCommands.ts
        if (command === ComponentCommands.SET_DYNAMIC_VC) {
            await this.setRootDynamicVoiceChannel(args, message);
        }
        return Promise.resolve(undefined);
    }

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
                    channelString += `${channel} => Max Children: ${channel.rootsMaxChildren}\n`;
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
            if (channel.type !== 'voice') {
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

    async addOrRemoveRootDynamicVoiceChannel(voiceChannel: VoiceChannel, maxChildren?: number): Promise<string> {
        const removed = await this.removeRootDynamicVoiceChannel(voiceChannel);
        if (removed) {
            return `Removed ${voiceChannel} from VC Channels list!`;
        } else {
            if (maxChildren) {
                await this.addDynamicVoiceChannel(voiceChannel, maxChildren);
                return `Added ${voiceChannel} to the VC Channels list!`;
            } else {
                return `Adding channel requires an integer for the maximum amount of child channels`;
            }
        }
    }

    async addDynamicVoiceChannel(voiceChannel: VoiceChannel, maxChildren: number): Promise<void> {
        let newRootDynamicChannel = voiceChannel as DynamicVoiceChannel;
        newRootDynamicChannel.root = true;
        newRootDynamicChannel.parentChannel = undefined;
        newRootDynamicChannel.childChannel = undefined;
        newRootDynamicChannel.rootsMaxChildren = maxChildren;
        this.markedVoiceChannels.push(newRootDynamicChannel);
        await this.djmtGuild.saveJSON();
    }

    async removeRootDynamicVoiceChannel(voiceChannel: VoiceChannel): Promise<boolean> {
        let rootDynamicChannel = voiceChannel as DynamicVoiceChannel;
        for (const rootChannel of this.markedVoiceChannels) {
            if (rootChannel.id === rootDynamicChannel.id) {
                this.markedVoiceChannels.splice(this.markedVoiceChannels.indexOf(rootChannel), 1);
                await this.djmtGuild.saveJSON();
                return true;
            }
        }
        return false;
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        console.log('voice state update');
        // Whenever Voice Channel State Updates for any marked channel
        if (this.markedVoiceChannels.some(markedVC => {
            console.log(`${markedVC.id} vs ${oldState.channel?.id} - ${newState.channel?.id}`);
            return (markedVC.id === oldState.channel?.id) || (markedVC.id === newState.channel?.id)
        })) {
            // Check if we need to create or delete a dynamic channel
            for (const markedVC of this.markedVoiceChannels) {
                // If the user joined a Marked Voice Channel
                if (markedVC.id === newState.channel?.id) {
                    console.log('channel found');
                    console.log(markedVC.name);
                    // If there's no child channel, create one
                    if (!markedVC.childChannel) {
                        console.log('creating');
                        await this.createChildVC(markedVC);
                    }
                    break;
                }
            }
            for(const markedVC of this.markedVoiceChannels) {
                // Always check if we need to delete empty dynamic channels.
                // Deleting should only be done to channels that aren't root channels and that are empty
                if (!markedVC.root && markedVC.members.size === 0) {
                    // Delete if the marked channel is empty and it has no parent
                    if (!markedVC.parentChannel) {
                        await this.deleteChildVC(markedVC, `${markedVC.name} is empty`);
                    }
                    // Delete if the marked channel is empty, and if it has a parent channel with nobody in it
                    else if (markedVC.parentChannel.members.size === 0) {
                        await this.deleteChildVC(markedVC, `${markedVC.name} and parent channel ${markedVC.parentChannel.name} are empty.`);
                    }
                }
            }
        }
    }

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
        await voiceChannel.delete(reason);
        console.log(`[${this.djmtGuild.guildId}] Deleted ${voiceChannel.name} ${voiceChannel.id}`);
    }

    private async createChildVC(voiceChannel: DynamicVoiceChannel) {
            console.log(`creating for  ${voiceChannel.name}`);
            // Get the number at the end of the marked channel
            const markedChannelName: string = voiceChannel.name ?? "Extra Channel";
            const lastSpaceIndex: number = markedChannelName.lastIndexOf(" "); // The number should be right after the last space
            const markedChannelCount: number = lastSpaceIndex === -1 ? 1 : Number(markedChannelName.substring(lastSpaceIndex));
            const markedChannelNameWithoutNumber: string = lastSpaceIndex === -1 ? markedChannelName : markedChannelName.substring(0, lastSpaceIndex);
            const nextChannelName: string = `${markedChannelNameWithoutNumber} ${markedChannelCount + 1}`;
        if (!this.creatingChannel.get(nextChannelName)) {
            this.creatingChannel.set(nextChannelName, true);
            if (markedChannelCount >= (voiceChannel.rootsMaxChildren || this.GUILD_MAXIMUM_GENERATED_CHANNELS)) {
                console.log(`[${this.djmtGuild.guildId}] Did not generate Child VC, at Maximum Child Limit.`);
            } else if (this.markedVoiceChannels.some(voiceChannel => voiceChannel.name === nextChannelName)) {
                const foundChannel: DynamicVoiceChannel = this.markedVoiceChannels.find(voiceChannel => voiceChannel.name === nextChannelName) as DynamicVoiceChannel;
                voiceChannel.childChannel = foundChannel;
                foundChannel.parentChannel = voiceChannel;
                console.log(`[${this.djmtGuild.guildId}] Did not generate Child VC, channel with the name ${foundChannel.name} already exists.`);
            } else {
                this.creatingChannel.set(nextChannelName, true);
                console.log(`POSITION ${voiceChannel.position}`);
                let childVoiceChannel: DynamicVoiceChannel = (await this.djmtGuild.guild?.channels.create(nextChannelName ?? "Extra", {
                    type: 'voice',
                    userLimit: 7,
                    parent: voiceChannel.parent as Channel,
                    position: voiceChannel.position + 1,
                    reason: `Dynamic Voice Channel created for ${markedChannelName}`
                })) as DynamicVoiceChannel;
                console.log(`created: ${childVoiceChannel}`);
                childVoiceChannel.parentChannel = voiceChannel;
                childVoiceChannel.childChannel = undefined;
                childVoiceChannel.rootsMaxChildren = voiceChannel.rootsMaxChildren;
                childVoiceChannel.root = false;
                voiceChannel.childChannel = childVoiceChannel;
                this.markedVoiceChannels.push(childVoiceChannel);
                console.log(`[${this.djmtGuild.guildId}] Generated child VC ${childVoiceChannel.name} ${childVoiceChannel.id}`);

                this.creatingChannel.set(nextChannelName, false)
            }
        } else {
            console.log(`Not creating, already creating for this channel`);
        }
    }
}
