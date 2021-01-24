import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {client} from "../app";
import {Cron} from "../types/Cron";

export abstract class Component {
    client: Client;
    name: string;
    protected constructor(name: string) {
        this.client = client;
        this.name = name;
    }
    // Cron Scheduling https://github.com/node-cron/node-cron
    abstract async cron(cron: Cron): Promise<void>;
    // Events
    abstract async onGuildMemberAdd(member: GuildMember): Promise<void>;
    abstract async onMessage(args: string[], message: Message): Promise<void>;
    abstract async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void>;
    abstract async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void>;
    abstract async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
    abstract async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void>;
    abstract async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void>;
    abstract async onTypingStart(channel: Channel, user: User):Promise<void>;

}
