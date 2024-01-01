import {ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, SlashCommandBuilder, User, VoiceState} from "discord.js";
import {ComponentCommands} from "../Constants/ComponentCommands";
import {Component} from "../Component";
import {ComponentNames} from "../Constants/ComponentNames";

const pingCommand = new SlashCommandBuilder();
pingCommand.setName(ComponentCommands.PING);
pingCommand.setDescription("Pings the bot")

interface PingComponentSave {}
export class PingComponent extends Component<PingComponentSave>{

    name: ComponentNames = ComponentNames.PING;
    commands: SlashCommandBuilder[] = [pingCommand];

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
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
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.PING) {
            await this.pingCmd(interaction);
        }
        return Promise.resolve(undefined);
    }

    async pingCmd(interaction: ChatInputCommandInteraction) {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await interaction.reply("Ping?");
        await m.edit(`Pong! Latency is ${m.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(this.djmtGuild.guild?.client.ws.ping ?? -1)}ms`);
    }

}
