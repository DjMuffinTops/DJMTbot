import {
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  SlashCommandBuilder,
  User,
  VoiceState,
} from "discord.js";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { Component } from "../Component";
import { ComponentNames } from "../Constants/ComponentNames";

const pingCommand = new SlashCommandBuilder();
pingCommand.setName(ComponentCommands.PING);
pingCommand.setDescription("Pings the bot");

type PingComponentSave = Record<string, unknown>;
export class PingComponent extends Component<PingComponentSave> {
  name: ComponentNames = ComponentNames.PING;
  commands: SlashCommandBuilder[] = [pingCommand];

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }
  getSaveData(): Promise<PingComponentSave> {
    return Promise.resolve({} as PingComponentSave);
  }

  afterLoadJSON(
    _loadedObject: PingComponentSave | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }

  onReady(): Promise<void> {
    return Promise.resolve();
  }

  onGuildMemberAdd(_member: GuildMember): Promise<void> {
    return Promise.resolve();
  }

  onMessageCreate(_args: string[], _message: Message): Promise<void> {
    return Promise.resolve();
  }

  onMessageReactionAdd(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve();
  }

  onMessageReactionRemove(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve();
  }

  onMessageUpdate(
    _oldMessage: Message,
    _newMessage: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve();
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === String(ComponentCommands.PING)) {
      await this.pingCmd(interaction);
    }
    return Promise.resolve();
  }

  async pingCmd(interaction: ChatInputCommandInteraction) {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await interaction.reply("Ping?");
    await m.edit(
      `Pong! Latency is ${
        m.createdTimestamp - interaction.createdTimestamp
      }ms. API Latency is ${Math.round(
        this.djmtGuild.guild?.client.ws.ping ?? -1,
      )}ms`,
    );
  }
}
