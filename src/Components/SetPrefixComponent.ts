import {Component} from "../Component";
import {Channel, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {ComponentCommands} from "../Constants/ComponentCommands";
import {isAdmin} from "../HelperFunctions";
import {ComponentNames} from "../Constants/ComponentNames";

export interface SetPrefixComponentSave {}
export class SetPrefixComponent extends Component<SetPrefixComponentSave> {

    name: ComponentNames = ComponentNames.SET_PREFIX;

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === ComponentCommands.SET_PREFIX) {
            await this.setPrefixCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async getSaveData(): Promise<SetPrefixComponentSave> {
        return {};
    }

    async afterLoadJSON(loadedObject: SetPrefixComponentSave | undefined): Promise<void> {
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

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
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
