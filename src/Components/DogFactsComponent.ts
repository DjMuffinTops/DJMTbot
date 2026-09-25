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

const dogFactCommand = new SlashCommandBuilder();
dogFactCommand.setName(ComponentCommands.DOG_FACT);
dogFactCommand.setDescription('Sends a random dog fact');

type DogFactsComponentSave = Record<string, unknown>;

type DogFactApiResponse = {
  data?: Array<{
    attributes?: {
      body?: string;
    };
  }>;
};

export class DogFactsComponent extends Component<DogFactsComponentSave> {
  name: ComponentNames = ComponentNames.DOG_FACTS;
  commands: SlashCommandBuilder[] = [dogFactCommand];

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  getSaveData(): Promise<DogFactsComponentSave> {
    return Promise.resolve({});
  }

  afterLoadJSON(
    _loadedObject: DogFactsComponentSave | undefined,
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
    if (interaction.commandName === ComponentCommands.DOG_FACT) {
      await this.sendDogFact(interaction);
    }
  }

  private async sendDogFact(interaction: ChatInputCommandInteraction) {
    try {
      const response = await fetch('https://dogapi.dog/api/v2/facts?limit=1');
      if (!response.ok) {
        throw new Error(`Dog fact request failed: ${response.status}`);
      }
      const data = (await response.json()) as DogFactApiResponse;
      const fact = data.data?.[0]?.attributes?.body?.trim();
      if (!fact) {
        throw new Error('Dog fact response missing fact text');
      }
      await interaction.reply({content: fact});
    } catch {
      await interaction.reply({
        content: 'Unable to fetch a dog fact right now. Try again later.',
      });
    }
  }
}
