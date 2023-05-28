import {GuildMember, Interaction, Message, MessageReaction, User, VoiceState} from "discord.js";
import {ComponentCommands} from "../Constants/ComponentCommands";
import {Component} from "../Component";
import {ComponentNames} from "../Constants/ComponentNames";

interface PingComponentSave {}
export class PingComponent extends Component<PingComponentSave>{

    name: ComponentNames = ComponentNames.PING;

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === ComponentCommands.PING) {
            await this.pingCmd(args, message);
        }
    }

    async getSaveData(): Promise<PingComponentSave> {
        return {};
    }

    async afterLoadJSON(loadedObject: PingComponentSave | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
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

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        return Promise.resolve(undefined);
    }

    async pingCmd(args: string[], message: Message) {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        await m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(this.djmtGuild.guild?.client.ws.ping ?? -1)}ms`);
    }

}
