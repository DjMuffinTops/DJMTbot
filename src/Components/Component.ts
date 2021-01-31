import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {Cron} from "../types/Cron";
import {Guild} from "../Guild";
import {ComponentNames} from "./ComponentNames";

export abstract class Component<T> {
    abstract name: ComponentNames;
    guild: Guild;
    public constructor(guild: Guild) {
        this.guild = guild;
    }
    // Events
    abstract async onReady(): Promise<void>;
    abstract async getSaveData(): Promise<T>;
    abstract async afterLoadJSON(loadedObject: T | undefined): Promise<void>;
    abstract async onGuildMemberAdd(member: GuildMember): Promise<void>;
    abstract async onMessage(args: string[], message: Message): Promise<void>;
    abstract async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void>;
    abstract async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void>;
    abstract async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
    abstract async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void>;
    abstract async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void>;
    abstract async onTypingStart(channel: Channel, user: User):Promise<void>;

}
