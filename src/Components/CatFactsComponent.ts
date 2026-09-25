import {Component} from '../Component';
import {
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  SlashCommandBuilder,
  User,
  VoiceState,
} from 'discord.js';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {ComponentNames} from '../Constants/ComponentNames';

const catFactCommand = new SlashCommandBuilder();
catFactCommand.setName(ComponentCommands.CAT_FACT);
catFactCommand.setDescription('Sends a random cat fact');

type CatFactsComponentSave = Record<string, unknown>;

type CatFactResponse = {
  fact?: string;
  length?: number;
};

export class CatFactsComponent extends Component<CatFactsComponentSave> {
  name: ComponentNames = ComponentNames.CAT_FACTS;
  commands: SlashCommandBuilder[] = [catFactCommand];

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  getSaveData(): Promise<CatFactsComponentSave> {
    return Promise.resolve({});
  }

  afterLoadJSON(
    _loadedObject: CatFactsComponentSave | undefined,
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

  onMessageUpdate(_oldMessage: Message, _newMessage: Message): Promise<void> {
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
    if (interaction.commandName === ComponentCommands.CAT_FACT) {
      await this.sendCatFact(interaction);
    }
  }

  private async sendCatFact(interaction: ChatInputCommandInteraction) {
    try {
      const response = await fetch('https://catfact.ninja/fact');
      if (!response.ok) {
        throw new Error(`Cat fact request failed: ${response.status}`);
      }
      const data = (await response.json()) as CatFactResponse;
      const fact = data.fact?.trim();
      if (!fact) {
        throw new Error('Cat fact response missing fact text');
      }
      await interaction.reply({content: fact});
    } catch {
      await interaction.reply({
        content: 'Unable to fetch a cat fact right now. Try again later.',
      });
    }
  }
}
