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
import {isInteractionAdmin} from '../HelperFunctions';
import {ComponentNames} from '../Constants/ComponentNames';
import {logger} from '../Logger';

const sayCommand = new SlashCommandBuilder();
sayCommand.setName(ComponentCommands.SAY);
sayCommand.setDescription('Makes the bot say something');
sayCommand.addStringOption(input =>
  input
    .setName('message')
    .setDescription('The message to say')
    .setRequired(true),
);

type SayComponentSave = Record<string, unknown>;
export class SayComponent extends Component<SayComponentSave> {
  name: ComponentNames = ComponentNames.SAY;
  commands: SlashCommandBuilder[] = [sayCommand];

  async onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async sayCmd(sayMessage: string, interaction: ChatInputCommandInteraction) {
    // Split the message by spaces
    const args = sayMessage.split(' ');
    const userId = `<@${interaction.member?.user.id}>`;
    const channel = interaction.channel;
    await interaction.deferReply({flags: ['Ephemeral']});
    const deniedMsgs = [
      `Sorry ${userId}, there's a 5% chance i'll actually say that.`,
      'Reh',
      `I'm gonna send you to the ranch, ${userId}`,
      `You have no power over me, ${userId}`,
      `I'm not gonna say that ${userId}...`,
      `Why should I say ${sayMessage}?`,
      `${sayMessage}???????`,
      `${args.reverse().join(' ')}`,
      `${sayMessage
        .toUpperCase()
        .substring(0, Math.round(sayMessage.length / 2))}-`,
    ];
    if (
      channel?.isSendable() &&
      !isInteractionAdmin(interaction) &&
      Math.random() < 0.95
    ) {
      logger.info('Denying say command from non-admin user', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        attemptedMessage: sayMessage,
      });
      await channel.send({
        content: deniedMsgs[Math.floor(Math.random() * deniedMsgs.length)],
        allowedMentions: {},
      });
      return;
    } else {
      logger.info('Executing say command', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        message: sayMessage,
      });
      // Send a message directly to the channel through a message
      if (channel?.isSendable()) {
        await channel.send({
          content: sayMessage,
          allowedMentions: {},
        });
      }
    }
    await interaction.editReply({
      content: 'Message sent!',
      allowedMentions: {},
    });
  }

  getSaveData(): Promise<SayComponentSave> {
    return Promise.resolve({});
  }

  afterLoadJSON(_loadedObject: SayComponentSave | undefined): Promise<void> {
    return Promise.resolve();
  }

  async onReady(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onGuildMemberAdd(_member: GuildMember): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageCreate(_args: string[], _message: Message): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageReactionAdd(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageReactionRemove(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageUpdate(
    _oldMessage: Message,
    _newMessage: Message,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === ComponentCommands.SAY) {
      await this.sayCmd(
        interaction.options.getString('message', true),
        interaction,
      );
    }
  }
}
