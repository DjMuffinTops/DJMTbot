import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {CommandStrings} from "../../commands/CommandStrings";
import {Cron} from "../../types/Cron";
import {Component} from "../Component";
import {Register} from "../../types/types";
import {ComponentNames} from "../ComponentNames";

export interface IPingCommand {}
export class PingCommand extends Component<IPingCommand>{

    name: ComponentNames = ComponentNames.PING;

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.PING) {
            await this.pingCmd(args, message);
        }
    }

    async onLoadJSON(register: IPingCommand): Promise<void> {
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

    async pingCmd(args: string[], message: Message) {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        await m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(this.guild.client.ws.ping)}ms`);
    }

}
