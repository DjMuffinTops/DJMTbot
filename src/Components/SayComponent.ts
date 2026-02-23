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
    const deniedMsgs = [
      `Sorry ${userId}, there's a 5% chance i'll actually say that.`,
      'Reh',
      ':RioluUgh:767528910065762315',
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
    if (!isInteractionAdmin(interaction) && Math.random() < 0.95) {
      await interaction.reply({
        content: deniedMsgs[Math.floor(Math.random() * deniedMsgs.length)],
        allowedMentions: {},
      });
      return;
    }
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:

    // And we get the bot to say the thing:
    await interaction.reply({
      content: sayMessage.length ? sayMessage : "You didn't say anything! >:(",
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
