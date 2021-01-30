import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {
    Channel,
    Client,
    GuildMember,
    Message,
    MessageReaction, TextChannel,
    User,
    VoiceChannel,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../ComponentNames";
import {isAdmin} from "../../commands/helper";
import {getConfig, updateConfig} from "../../commands/config";
import {CommandStrings} from "../../commands/CommandStrings";
import {VoiceTextPairs} from "../../types/types";

// Declare data you want to save in JSON here
export interface IVoiceTextPairCommand {

}

export class VoiceTextPairCommand extends Component<IVoiceTextPairCommand> implements IVoiceTextPairCommand {

    name: ComponentNames = ComponentNames.VOICE_TEXT_PAIR;

    async onLoadJSON(parsedJSON: IVoiceTextPairCommand): Promise<void> {
        return Promise.resolve(undefined);
    }

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
        if (command === CommandStrings.SET_VC_PAIRS) {
            await this.setVcChannelPairs(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async setVcChannelPairs(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (!this.guild.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
            return;
        }
        if (args.length === 0) {
            let channelString = "";
            if (this.guild.voiceTextPairs.length > 0) {
                this.guild.voiceTextPairs.forEach((pair: VoiceTextPairs) => {
                    channelString += ` ${pair.voiceChannel.toString()} ${pair.textChannel.toString()}\n`;
                });
                await message.channel.send(`VC Channels: ${channelString}`);
            } else {
                await message.channel.send(`No VC Channel Pairs have been set!`);
            }
        } else if (args.length === 2) {
            const voiceChannelId = args[0]; // Voice channel must be raw due to lack of mention
            const rawTextChannelId = args[1];
            let textChannelId = rawTextChannelId.substring(2, rawTextChannelId.indexOf('>'));
            let foundVoiceChannel = undefined;
            let foundTextChannel = undefined;
            try {
                foundVoiceChannel = await this.guild.client.channels.fetch(voiceChannelId);
                foundTextChannel = await this.guild.client.channels.fetch(textChannelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid! Make sure the given channels are the correct types (use help command for more info)");
                return;
            }
            if (foundVoiceChannel.type !== "voice" && foundTextChannel.type !== "text") {
                await message.channel.send(`The given channels are not the correct types`);
                return;
            }
            const success = await this.guild.setVoiceTextPair(foundVoiceChannel as VoiceChannel, foundTextChannel as TextChannel);
            if (success) {
                await message.channel.send(`Added ${[foundVoiceChannel.toString(),foundTextChannel.toString()]} to the VC Channels list!`);
            } else {
                await message.channel.send(`Removed ${[foundVoiceChannel.toString(),foundTextChannel.toString()]} from VC Channels list!`);
            }
        } else {
            await message.channel.send(`Requires exactly two arguments, a voice channel id, and a text channel mention. You gave ${args}`);

        }
    }

}
