import {Component} from '../Component';
import {Cron} from '../Cron';
import {logger} from '../Logger';
import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextBasedChannel,
  TextChannel,
  User,
  VoiceState,
} from 'discord.js';
import {ComponentNames} from '../Constants/ComponentNames';
import {dayOfTheWeekConstants} from '../Constants/DayOfTheWeekConstants';
import {isInteractionAdmin} from '../HelperFunctions';
import {ComponentCommands} from '../Constants/ComponentCommands';

const setDotwCommand = new SlashCommandBuilder();
setDotwCommand.setName(ComponentCommands.SET_DOTW);
setDotwCommand.setDescription('Sets the day of the week channel');
setDotwCommand.addChannelOption(input =>
  input
    .setName('channel')
    .setDescription(
      'The channel to add or remove from the day of the week channels list',
    )
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setDotwCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printDotwCommand = new SlashCommandBuilder();
printDotwCommand.setName(ComponentCommands.PRINT_DOTW);
printDotwCommand.setDescription('Prints the day of the week channel');
printDotwCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Declare data you want to save in JSON here
interface DayOfTheWeekComponentSave {
  dotwChannels: string[];
}

interface DayOfTheWeek {
  day: string;
  messages: string[];
}

export class DayOfTheWeekComponent extends Component<DayOfTheWeekComponentSave> {
  name: ComponentNames = ComponentNames.DAY_OF_THE_WEEK;
  commands: SlashCommandBuilder[] = [setDotwCommand, printDotwCommand];
  dotwChannels: string[] = [];

  getSaveData(): Promise<DayOfTheWeekComponentSave> {
    return Promise.resolve({dotwChannels: this.dotwChannels});
  }

  afterLoadJSON(
    _loadedObject: DayOfTheWeekComponentSave | undefined,
  ): Promise<void> {
    if (_loadedObject) {
      this.dotwChannels = _loadedObject.dotwChannels;
    }
    return Promise.resolve();
  }

  onReady(): Promise<void> {
    Cron.getInstance().schedule('0 59 10 * * *', () => {
      void this.dotwJob();
    });

    Cron.getInstance().schedule('0 30 17 * * *', () => {
      void this.pleasantEveningJob();
    });

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

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
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
    if (interaction.commandName === ComponentCommands.SET_DOTW) {
      // Admin only
      if (!isInteractionAdmin(interaction)) {
        await interaction.reply({
          content: 'This command requires administrator permissions.',
        });
        return;
      }
      await this.setDotwCmd(
        interaction.options.getChannel<ChannelType.GuildText>('channel', true),
        interaction,
      );
    } else if (interaction.commandName === ComponentCommands.PRINT_DOTW) {
      // Admin only
      if (!isInteractionAdmin(interaction)) {
        await interaction.reply({
          content: 'This command requires administrator permissions.',
        });
        return;
      }
      await this.printDotwChannels(interaction);
    }
  }

  async dotwJob() {
    const date = new Date();
    const today: DayOfTheWeek = dayOfTheWeekConstants[date.getDay()];
    logger.info('Running Day of the Week job', {
      guildId: this.djmtGuild.guildId,
      day: today.day,
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    });
    for (const channelId of this.dotwChannels) {
      const channel = this.djmtGuild.getGuildChannel(channelId) as TextChannel;
      if (!channel) {
        logger.error('DOTW Job: Channel could not be found', {channelId});
      } else {
        // Determine which dotw post to send
        const randomMessage =
          today.messages[Math.floor(today.messages.length * Math.random())];
        await channel.send(randomMessage);
        logger.info('DOTW message sent', {
          guildId: this.djmtGuild.guildId,
          time: date.toLocaleTimeString(),
          message: randomMessage || '',
        });
      }
    }
  }

  async pleasantEveningJob() {
    if (Math.random() < 0.4) {
      for (const channelId of this.dotwChannels) {
        const channel = this.djmtGuild.getGuildChannel(
          channelId,
        ) as TextChannel;
        if (!channel) {
          logger.error('PleasantEveningJob: Could not find channel', {
            channelId,
          });
        } else {
          // Determine which dotw post to send
          const msg =
            'https://cdn.discordapp.com/attachments/683557958327730219/793229701920718858/unknown.png';
          await channel.send(msg);
        }
      }
    }
  }

  async setDotwCmd(
    channel: TextBasedChannel,
    interaction: ChatInputCommandInteraction,
  ) {
    if (this.dotwChannels.includes(channel.id)) {
      this.dotwChannels = [];
      await this.djmtGuild.saveJSON();
      await interaction.reply({
        content: `Removed <#${channel.id}> as the Day of the Week Channel!`,
        ephemeral: true,
      });
    } else {
      this.dotwChannels = [channel.id];
      await this.djmtGuild.saveJSON();
      await interaction.reply({
        content: `Set <#${channel.id}> as the Day of the Week Channel!`,
        ephemeral: true,
      });
    }
  }

  async printDotwChannels(interaction: ChatInputCommandInteraction) {
    let channelString = '';
    if (this.dotwChannels?.length > 0) {
      this.dotwChannels.forEach((channelId: string) => {
        channelString += `<#${channelId}> `;
      });
      await interaction.reply({
        content: `Day of the Week Channel: ${channelString}`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'No Day of the Week Channel has been set!',
        ephemeral: true,
      });
    }
  }
}
