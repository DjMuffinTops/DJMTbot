import {Component} from '../Component';
import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageFlags,
  MessageReaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextBasedChannel,
  User,
  VoiceState,
} from 'discord.js';
import {ComponentNames} from '../Constants/ComponentNames';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {MusicComponent} from './MusicComponent';

const setDebugCommand = new SlashCommandBuilder();
setDebugCommand.setName(ComponentCommands.SET_DEBUG_CHANNEL);
setDebugCommand.setDescription('Sets the debug channel');
setDebugCommand.addChannelOption(input =>
  input
    .setName('channel')
    .setDescription('The channel to add or remove from the debug channels list')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setDebugCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const debugModeCommand = new SlashCommandBuilder();
debugModeCommand.setName(ComponentCommands.DEBUG_MODE);
debugModeCommand.setDescription('Toggles debug mode');
debugModeCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setPrefixCommand = new SlashCommandBuilder();
setPrefixCommand.setName(ComponentCommands.SET_PREFIX);
setPrefixCommand.setDescription('Sets the bot prefix');
setPrefixCommand.addStringOption(input =>
  input.setName('prefix').setDescription('The prefix to set').setRequired(true),
);
setPrefixCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setModAlertsChannelCommand = new SlashCommandBuilder();
setModAlertsChannelCommand.setName(ComponentCommands.SET_MOD_ALERTS_CHANNEL);
setModAlertsChannelCommand.setDescription('Sets the mod alerts channel');
setModAlertsChannelCommand.addChannelOption(input =>
  input
    .setName('channel')
    .setDescription(
      'The channel to add or remove from the mod alerts channels list',
    )
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setModAlertsChannelCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

const setModLoggingChannelCommand = new SlashCommandBuilder();
setModLoggingChannelCommand.setName(ComponentCommands.SET_MOD_LOGGING_CHANNEL);
setModLoggingChannelCommand.setDescription('Sets the mod logging channel');
setModLoggingChannelCommand.addChannelOption(input =>
  input
    .setName('channel')
    .setDescription(
      'The channel to add or remove from the mod logging channels list',
    )
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setModLoggingChannelCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

const setRadioVoiceChannelCommand = new SlashCommandBuilder();
setRadioVoiceChannelCommand.setName(ComponentCommands.SET_RADIO_VOICE_CHANNEL);
setRadioVoiceChannelCommand.setDescription(
  'Sets the radio voice channel used for now-playing status updates',
);
setRadioVoiceChannelCommand.addChannelOption(input =>
  input
    .setName('channel')
    .setDescription(
      'The voice channel to add or remove for radio status updates',
    )
    .addChannelTypes(ChannelType.GuildVoice)
    .setRequired(true),
);
setRadioVoiceChannelCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

// Declare data you want to save in JSON here
type DebugComponentSave = Record<string, unknown>;

type SetRadioVoiceChannelParams = {
  radioVoiceChannel: TextBasedChannel;
  interaction: ChatInputCommandInteraction;
};

export class GuildSettersComponent extends Component<DebugComponentSave> {
  name: ComponentNames = ComponentNames.DEBUG;
  commands: SlashCommandBuilder[] = [
    setDebugCommand,
    debugModeCommand,
    setPrefixCommand,
    setModAlertsChannelCommand,
    setModLoggingChannelCommand,
    setRadioVoiceChannelCommand,
  ];

  getSaveData(): Promise<DebugComponentSave> {
    return Promise.resolve({} as DebugComponentSave);
  }

  afterLoadJSON(_parsedJSON: DebugComponentSave | undefined): Promise<void> {
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

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === ComponentCommands.SET_DEBUG_CHANNEL) {
      await this.setDebugChannel(
        interaction.options.getChannel<ChannelType.GuildText>('channel', true),
        interaction,
      );
    } else if (interaction.commandName === ComponentCommands.DEBUG_MODE) {
      await this.debugModeCmd(interaction);
    } else if (interaction.commandName === ComponentCommands.SET_PREFIX) {
      await this.setPrefixCmd(
        interaction.options.getString('prefix', true),
        interaction,
      );
    } else if (
      interaction.commandName === ComponentCommands.SET_MOD_ALERTS_CHANNEL
    ) {
      await this.setModAlertsChannel(
        interaction.options.getChannel<ChannelType.GuildText>('channel', true),
        interaction,
      );
    } else if (
      interaction.commandName === ComponentCommands.SET_MOD_LOGGING_CHANNEL
    ) {
      await this.setModLoggingChannel(
        interaction.options.getChannel<ChannelType.GuildText>('channel', true),
        interaction,
      );
    } else if (
      interaction.commandName === ComponentCommands.SET_RADIO_VOICE_CHANNEL
    ) {
      await this.setRadioVoiceChannel({
        radioVoiceChannel:
          interaction.options.getChannel<ChannelType.GuildVoice>(
            'channel',
            true,
          ),
        interaction,
      });
    }
    return Promise.resolve(undefined);
  }

  async onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    const _command = _args?.shift()?.toLowerCase() || '';

    return Promise.resolve(undefined);
  }

  async onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async debugModeCmd(interaction: ChatInputCommandInteraction) {
    this.djmtGuild.debugMode = !this.djmtGuild.debugMode;
    // await updateConfig(gConfig, message);
    await interaction.reply({
      content: `Dev Mode ${this.djmtGuild.debugMode ? 'enabled' : 'disabled'}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  async setDebugChannel(
    debugChannel: TextBasedChannel,
    interaction: ChatInputCommandInteraction,
  ) {
    if (this.djmtGuild.debugChannelId === debugChannel.id) {
      this.djmtGuild.debugChannelId = undefined;
      await interaction.reply({
        content: `${debugChannel.toString()} is no longer set as the debugChannel`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      this.djmtGuild.debugChannelId = debugChannel.id;
      await interaction.reply({
        content: `${debugChannel.toString()} is now set as the debugChannel channel`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  async setPrefixCmd(
    newPrefix: string,
    interaction: ChatInputCommandInteraction,
  ) {
    const defaultPrefix = 'djmt!';
    this.djmtGuild.prefix = newPrefix ?? defaultPrefix;
    await interaction.reply({
      content: `Set my prefix to \`\`${this.djmtGuild.prefix}\`\``,
      flags: MessageFlags.Ephemeral,
    });
  }

  async setModAlertsChannel(
    modAlertsChannel: TextBasedChannel,
    interaction: ChatInputCommandInteraction,
  ) {
    if (this.djmtGuild.modAlertsChannelId === modAlertsChannel.id) {
      this.djmtGuild.modAlertsChannelId = undefined;
      await interaction.reply({
        content: `${modAlertsChannel.toString()} is no longer set as the mod alerts channel`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      this.djmtGuild.modAlertsChannelId = modAlertsChannel.id;
      await interaction.reply({
        content: `${modAlertsChannel.toString()} is now set as the mod alerts channel`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  async setModLoggingChannel(
    modLoggingChannel: TextBasedChannel,
    interaction: ChatInputCommandInteraction,
  ) {
    if (this.djmtGuild.modLoggingChannelId === modLoggingChannel.id) {
      this.djmtGuild.modLoggingChannelId = undefined;
      await interaction.reply({
        content: `${modLoggingChannel.toString()} is no longer set as the mod logging channel`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      this.djmtGuild.modLoggingChannelId = modLoggingChannel.id;
      await interaction.reply({
        content: `${modLoggingChannel.toString()} is now set as the mod logging channel`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  /**
   * Sets or unsets the configured radio voice channel for now-playing status updates.
   * Setting starts polling; unsetting stops polling only when radio is not active.
   */
  async setRadioVoiceChannel(params: SetRadioVoiceChannelParams) {
    const {radioVoiceChannel, interaction} = params;
    const musicComponent = this.djmtGuild.getComponent(ComponentNames.MUSIC) as
      | MusicComponent
      | undefined;

    if (this.djmtGuild.radioVoiceChannelId === radioVoiceChannel.id) {
      this.djmtGuild.radioVoiceChannelId = undefined;
      musicComponent?.stopPollingIfRadioInactive();
      await interaction.reply({
        content: `${radioVoiceChannel.toString()} is no longer set as the radio voice channel`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      this.djmtGuild.radioVoiceChannelId = radioVoiceChannel.id;
      musicComponent?.ensureRadioVoicePolling();
      await interaction.reply({
        content: `${radioVoiceChannel.toString()} is now set as the radio voice channel`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
