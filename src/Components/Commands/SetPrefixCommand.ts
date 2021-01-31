import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {CommandStrings} from "../../commands/CommandStrings";
import {isAdmin} from "../../commands/helper";
import {ComponentNames} from "../ComponentNames";

export interface ISetPrefixCommand {}
export class SetPrefixCommand extends Component<ISetPrefixCommand> {

    name: ComponentNames = ComponentNames.SET_PREFIX;

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.SET_PREFIX) {
            await this.setPrefixCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async getSaveData(): Promise<ISetPrefixCommand> {
        return {};
    }

    async afterLoadJSON(loadedObject: ISetPrefixCommand | undefined): Promise<void> {
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
