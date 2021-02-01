import {Component} from "../Component";
import {Channel, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {isAdmin} from "../HelperFunctions";
import {ComponentCommands} from "../Constants/ComponentCommands";

// Declare data you want to save in JSON here
export interface DebugComponentSave {

}

export class GuildSettersComponent extends Component<DebugComponentSave> {

    name: ComponentNames = ComponentNames.DEBUG;

    async getSaveData(): Promise<DebugComponentSave> {
        return {};
    }

    async afterLoadJSON(parsedJSON: DebugComponentSave | undefined): Promise<void> {
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
        if (command === ComponentCommands.SET_DEBUG_CHANNEL) {
            await this.setDebugChannel(args, message);
        } else if (command === ComponentCommands.DEBUG_MODE) {
            await this.debugModeCmd(args, message);
        } else if (command === ComponentCommands.SET_PREFIX) {
            await this.setPrefixCmd(args, message);
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

    async setPrefixCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        if (args.length === 0) {
            this.guild.prefix = process.env.DEFAULT_PREFIX as string;
            await message.channel.send(`Set my prefix to \`\`${process.env.DEFAULT_PREFIX}\`\``);
        } else if (args.length === 1) {
            this.guild.prefix = args[0] ? args[0] : process.env.DEFAULT_PREFIX as string;
            await message.channel.send(`Set my prefix to \`\`${this.guild.prefix}\`\``);
        } else {
            await message.channel.send(`Please enter a single prefix.`);
        }
    }

}
