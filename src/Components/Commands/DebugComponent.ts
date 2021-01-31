import {Component} from "../Component";
import {Channel, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {ComponentNames} from "../ComponentNames";
import {isAdmin} from "../../helper";
import {CommandStrings} from "../../Constants/CommandStrings";

// Declare data you want to save in JSON here
export interface IDebugComponent {

}

export class DebugComponent extends Component<IDebugComponent> {

    name: ComponentNames = ComponentNames.DEBUG;

    async getSaveData(): Promise<IDebugComponent> {
        return {};
    }

    async afterLoadJSON(parsedJSON: IDebugComponent | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
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
        if (command === CommandStrings.SET_DEBUG_CHANNEL) {
            await this.setDebugChannel(args, message);
        }
        if (command === CommandStrings.DEBUG_MODE) {
            await this.debugModeCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async debugModeCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        this.guild.debugMode = !this.guild.debugMode;
        // await updateConfig(gConfig, message);
        await message.channel.send(`Dev Mode ${this.guild.debugMode ? "enabled" : "disabled" }.`);
    }

    async setDebugChannel(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        if (this.guild.debugChannel === message.channel.id) {
            this.guild.debugChannel = "";
            await message.channel.send(`${message.channel.toString()} is no longer set as the debugChannel`);
        } else {
            this.guild.debugChannel = message.channel.id;
            await message.channel.send(`${message.channel.toString()} is now set as the debugChannel channel`);
        }
    }

}
