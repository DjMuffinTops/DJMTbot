import {
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  SlashCommandBuilder,
  User,
  VoiceState,
  EmbedBuilder,
  GuildTextBasedChannel,
} from 'discord.js';
import {DisTube, Song} from 'distube';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {Component} from '../Component';
import {ComponentNames} from '../Constants/ComponentNames';
import {DJMTbot} from '../DJMTbot';
import {logger} from '../Logger';
import {
  buildRadioNowPlayingEmbed,
  buildRadioNowPlayingEmbedForSong,
  fetchRadioNowPlaying,
  isRadioStreamUrl,
  RADIO_FALLBACK_URL,
  RADIO_PRIMARY_URL,
  RADIO_STATUS_URL,
} from '../RadioNowPlaying';

// Command builders
const playCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.PLAY)
  .setDescription('Play a song or add it to the queue')
  .addStringOption(option =>
    option
      .setName('query')
      .setDescription('Song name, URL, or file')
      .setRequired(true),
  );

const radioCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.RADIO)
  .setDescription('Play DJMuffinTops radio')
  .addBooleanOption(option =>
    option
      .setName('silencemessages')
      .setDescription('Disable periodic radio now-playing messages'),
  );

const skipCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.SKIP)
  .setDescription('Skip the current song');

const stopCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.STOP)
  .setDescription('Stop playing and clear the queue');

const leaveCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.LEAVE)
  .setDescription('Stop, clear queue, and disconnect from voice channel');

const pauseCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.PAUSE)
  .setDescription('Pause the current song');

const resumeCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.RESUME)
  .setDescription('Resume the paused song');

const queueCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.QUEUE)
  .setDescription('Show the current queue');

const nowPlayingCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.NOWPLAYING)
  .setDescription('Show the currently playing song');

const volumeCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.VOLUME)
  .setDescription('Set the volume (0-100)')
  .addIntegerOption(option =>
    option
      .setName('level')
      .setDescription('Volume level')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100),
  );

const loopCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.LOOP)
  .setDescription('Toggle loop mode')
  .addStringOption(option =>
    option
      .setName('mode')
      .setDescription('Loop mode')
      .setRequired(true)
      .addChoices(
        {name: 'Off', value: 'off'},
        {name: 'Song', value: 'song'},
        {name: 'Queue', value: 'queue'},
      ),
  );

const autoplayCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.AUTOPLAY)
  .setDescription('Toggle autoplay mode');

const playFileCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.PLAYFILE)
  .setDescription('Play an audio file from an attachment')
  .addAttachmentOption(option =>
    option
      .setName('file')
      .setDescription('Audio file to play (mp3, wav, ogg, etc.)')
      .setRequired(true),
  );

type MusicComponentSave = {
  volume: number | null;
};

type RadioPollingState = {
  previousTrackSnapshotKey: string | null;
  previousNowPlayingMessageId: string | null;
  previousVoiceStatus: string | null;
  previousVoiceChannelId: string | null;
};

type RadioPollingOptions = {
  textChannel?: GuildTextBasedChannel;
  shouldSendMessages?: boolean;
};

type StopRadioPollingOptions = {
  clearVoiceStatus?: boolean;
};

type RadioVoiceStatusUpdate = {
  channelId: string;
  status: string | null;
};

export class MusicComponent extends Component<MusicComponentSave> {
  private readonly radioNowPlayingPollIntervalMs = 10000;
  private readonly radioPrimaryUrl = RADIO_PRIMARY_URL;
  private readonly radioFallbackUrl = RADIO_FALLBACK_URL;
  private readonly radioStatusUrl = RADIO_STATUS_URL;
  private volumePreference: number | null = null;
  private radioPollInterval: NodeJS.Timeout | null = null;
  private radioPollingState: RadioPollingState = {
    previousTrackSnapshotKey: null,
    previousNowPlayingMessageId: null,
    previousVoiceStatus: null,
    previousVoiceChannelId: null,
  };

  name: ComponentNames = ComponentNames.MUSIC;
  commands = [
    playCommand,
    radioCommand,
    playFileCommand,
    skipCommand,
    stopCommand,
    leaveCommand,
    pauseCommand,
    resumeCommand,
    queueCommand,
    nowPlayingCommand,
    volumeCommand,
    loopCommand,
    autoplayCommand,
  ];

  private get distube(): DisTube {
    return DJMTbot.getInstance().distube;
  }

  /** Persists user volume preference for this guild component instance. */
  getSaveData(): Promise<MusicComponentSave> {
    return Promise.resolve({
      volume: this.volumePreference,
    });
  }

  /** Restores persisted volume preference and normalizes invalid values. */
  afterLoadJSON(loadedObject: MusicComponentSave | undefined): Promise<void> {
    if (
      loadedObject &&
      typeof loadedObject.volume === 'number' &&
      loadedObject.volume >= 0 &&
      loadedObject.volume <= 100
    ) {
      this.volumePreference = loadedObject.volume;
    } else {
      this.volumePreference = null;
    }

    return Promise.resolve();
  }

  /**
   * Initializes radio polling at startup when a radio voice status channel is configured.
   */
  async onReady(): Promise<void> {
    if (this.hasRadioVoiceChannel()) {
      this.ensureRadioVoicePolling();
    }
    return Promise.resolve();
  }

  /** Applies the saved volume preference to the currently active queue, if any. */
  private applySavedVolumePreference(): void {
    if (this.volumePreference === null) {
      return;
    }
    const queue = this.distube.getQueue(this.djmtGuild.guildId);
    try {
      queue?.setVolume(this.volumePreference);
      logger.info('Applied saved volume setting', {
        guildId: this.djmtGuild.guildId,
        volume: this.volumePreference,
      });
    } catch (error) {
      logger.warn('Failed to apply saved volume setting', {
        guildId: this.djmtGuild.guildId,
        volume: this.volumePreference,
        error,
      });
    }
  }

  onGuildMemberAdd(_member: GuildMember): Promise<void> {
    return Promise.resolve();
  }

  /** No-op: this component does not process generic text messages. */
  onMessageCreate(_args: string[], _message: Message): Promise<void> {
    return Promise.resolve();
  }

  /** No-op: this component currently only supports slash commands. */
  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** No-op: message reactions are not used by music controls in this component. */
  onMessageReactionAdd(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** No-op: message reactions are not used by music controls in this component. */
  onMessageReactionRemove(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** No-op: edited message content does not affect music state. */
  onMessageUpdate(_oldMessage: Message, _newMessage: Message): Promise<void> {
    return Promise.resolve();
  }

  /** No-op: voice state updates are handled by DisTube internals for playback flow. */
  onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** Routes slash commands owned by this component to their handler methods. */
  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const commandName = interaction.commandName;

    switch (commandName) {
      case ComponentCommands.PLAY:
        await this.playCmd(interaction);
        break;
      case ComponentCommands.RADIO:
        await this.radioCmd(interaction);
        break;
      case ComponentCommands.PLAYFILE:
        await this.playFileCmd(interaction);
        break;
      case ComponentCommands.SKIP:
        await this.skipCmd(interaction);
        break;
      case ComponentCommands.STOP:
        await this.stopCmd(interaction);
        break;
      case ComponentCommands.LEAVE:
        await this.leaveCmd(interaction);
        break;
      case ComponentCommands.PAUSE:
        await this.pauseCmd(interaction);
        break;
      case ComponentCommands.RESUME:
        await this.resumeCmd(interaction);
        break;
      case ComponentCommands.QUEUE:
        await this.queueCmd(interaction);
        break;
      case ComponentCommands.NOWPLAYING:
        await this.nowPlayingCmd(interaction);
        break;
      case ComponentCommands.VOLUME:
        await this.volumeCmd(interaction);
        break;
      case ComponentCommands.LOOP:
        await this.loopCmd(interaction);
        break;
      case ComponentCommands.AUTOPLAY:
        await this.autoplayCmd(interaction);
        break;
    }
  }

  /** Queues a track or URL and ensures saved volume is applied after queue creation. */
  private async playCmd(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You must be in a voice channel to play music!',
        flags: ['Ephemeral'],
      });
      return;
    }

    const query = interaction.options.getString('query', true);

    await interaction.deferReply();

    try {
      await this.distube.play(voiceChannel, query, {
        textChannel: interaction.channel as GuildTextBasedChannel,
        member: member,
      });
      this.applySavedVolumePreference();
      logger.info('Playing music', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        query: query,
      });
      await interaction.editReply('🎵 Processing your request...');
    } catch (error) {
      logger.error('Error playing music', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        query: query,
        error,
      });
      await interaction.editReply(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Plays the radio stream and starts the shared polling loop that powers
   * text now-playing messages and optional voice channel status updates.
   */
  private async radioCmd(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel;
    const guildId = interaction.guildId;
    const silenceMessages =
      interaction.options.getBoolean('silencemessages') ?? false;

    if (!guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: ['Ephemeral'],
      });
      // Command is guild-only because radio state is stored per guild.
      return;
    }

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You must be in a voice channel to play music!',
        flags: ['Ephemeral'],
      });
      // DisTube needs a joinable voice channel context to start playback.
      return;
    }
    await interaction.deferReply({
      flags: silenceMessages ? ['Ephemeral'] : undefined,
    });

    const playOptions = {
      textChannel: interaction.channel as GuildTextBasedChannel,
      member: member,
    };

    this.stopRadioNowPlayingPolling();

    const streamAttempts = [
      {url: this.radioPrimaryUrl, logMessage: 'Playing radio stream'},
      {
        url: this.radioFallbackUrl,
        logMessage: 'Playing fallback radio stream',
      },
    ];

    let lastError: unknown;

    for (let i = 0; i < streamAttempts.length; i++) {
      const streamAttempt = streamAttempts[i];

      try {
        await this.distube.play(voiceChannel, streamAttempt.url, playOptions);
        this.applySavedVolumePreference();
        if (interaction.channel || this.hasRadioVoiceChannel()) {
          this.startRadioNowPlayingPolling({
            textChannel: interaction.channel as
              | GuildTextBasedChannel
              | undefined,
            shouldSendMessages: !silenceMessages,
          });
        }
        logger.info(streamAttempt.logMessage, {
          userId: interaction.member?.user.id,
          username: interaction.member?.user.username,
          url: streamAttempt.url,
          silenceMessages,
        });
        if (silenceMessages) {
          await interaction.editReply(
            '🎵 Playing radio with now-playing messages silenced.',
          );
        } else {
          await interaction.deleteReply();
        }
        return;
      } catch (error) {
        lastError = error;

        if (i === 0) {
          logger.warn('Primary radio stream failed, attempting fallback', {
            userId: interaction.member?.user.id,
            username: interaction.member?.user.username,
            primaryUrl: this.radioPrimaryUrl,
            fallbackUrl: this.radioFallbackUrl,
            error,
          });
          continue;
        }
      }
    }

    logger.error('Radio stream failed for both primary and fallback URLs', {
      userId: interaction.member?.user.id,
      username: interaction.member?.user.username,
      primaryUrl: this.radioPrimaryUrl,
      fallbackUrl: this.radioFallbackUrl,
      error: lastError,
    });
    await interaction.editReply(
      `❌ Could not start radio stream. ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
    );
  }

  /** Returns true when a radio voice status target channel has been configured. */
  private hasRadioVoiceChannel(): boolean {
    return this.djmtGuild.radioVoiceChannelId.length > 0;
  }

  /**
   * Starts polling only if no polling interval is currently active.
   * Used on startup and when a radio voice channel gets configured.
   */
  ensureRadioVoicePolling(): void {
    if (this.radioPollInterval !== null) {
      // Polling is already active; avoid creating a duplicate interval.
      return;
    }
    this.startRadioNowPlayingPolling();
  }

  /**
   * Stops polling when unsetting the radio voice channel, but only if
   * the guild is not actively playing a radio stream.
   */
  stopPollingIfRadioInactive(): void {
    const queue = this.distube.getQueue(this.djmtGuild.guildId);
    const currentSong = queue?.songs[0];
    const radioActive =
      !!currentSong &&
      isRadioStreamUrl(
        currentSong.url,
        this.radioPrimaryUrl,
        this.radioFallbackUrl,
      );
    if (!radioActive) {
      this.stopRadioNowPlayingPolling();
    }
  }

  /**
   * Starts or refreshes the radio polling interval.
   * Passing options in an object keeps call sites readable as behavior evolves.
   */
  private startRadioNowPlayingPolling(options: RadioPollingOptions = {}): void {
    const {textChannel, shouldSendMessages = true} = options;

    this.stopRadioNowPlayingPolling({clearVoiceStatus: false});

    // Get now playing immediately
    void this.pollAndSendRadioNowPlaying({textChannel, shouldSendMessages});

    // Set up polling on an interval
    this.radioPollInterval = setInterval(() => {
      void this.pollAndSendRadioNowPlaying({textChannel, shouldSendMessages});
    }, this.radioNowPlayingPollIntervalMs);
  }

  /**
   * Clears the polling interval and in-memory state.
   * Optionally clears any previously set voice channel status.
   */
  private stopRadioNowPlayingPolling(
    options: StopRadioPollingOptions = {},
  ): void {
    const {clearVoiceStatus = true} = options;
    const previousVoiceChannelId =
      this.radioPollingState.previousVoiceChannelId;

    if (this.radioPollInterval) {
      clearInterval(this.radioPollInterval);
      this.radioPollInterval = null;
    }
    this.resetRadioPollingState();

    if (clearVoiceStatus && previousVoiceChannelId) {
      void this.updateRadioVoiceChannelStatus({
        channelId: previousVoiceChannelId,
        status: null,
      });
    }
  }

  /** Resets in-memory radio polling cache used to detect track/status changes. */
  private resetRadioPollingState(): void {
    this.radioPollingState = {
      previousTrackSnapshotKey: null,
      previousNowPlayingMessageId: null,
      previousVoiceStatus: null,
      previousVoiceChannelId: null,
    };
  }

  /**
   * Polls the radio metadata endpoint, then updates outputs (text message and/or
   * voice channel status) when a track or status change is detected.
   */
  private async pollAndSendRadioNowPlaying(
    options: RadioPollingOptions = {},
  ): Promise<void> {
    const {textChannel, shouldSendMessages = true} = options;
    const radioVoiceChannelId = this.djmtGuild.radioVoiceChannelId || undefined;

    if (!textChannel && !radioVoiceChannelId) {
      // No configured output targets left (no text channel and no voice status channel).
      this.stopRadioNowPlayingPolling({clearVoiceStatus: false});
      return;
    }

    try {
      // Get the next state from the radio metadata endpoint
      const nowPlaying = await fetchRadioNowPlaying({
        primaryUrl: this.radioPrimaryUrl,
        fallbackUrl: this.radioFallbackUrl,
        statusUrl: this.radioStatusUrl,
      });

      if (!nowPlaying) {
        // Metadata endpoint returned no usable payload this cycle.
        return;
      }

      // Next state snapshot key used for change detection between poll cycles.
      // If this value is unchanged, we skip text and voice updates.
      const nextTrackSnapshotKey = JSON.stringify({
        title: nowPlaying.title,
        artist: nowPlaying.artist,
        rawTitle: nowPlaying.rawTitle,
        listenUrl: nowPlaying.listenUrl,
      });

      // Get the previous state and its snapshot key to compare to
      const {
        previousTrackSnapshotKey,
        previousNowPlayingMessageId,
        previousVoiceStatus,
        previousVoiceChannelId,
      } = this.radioPollingState;

      // Get the next voice status to compare to the previous voice status
      const nextVoiceStatus = radioVoiceChannelId
        ? this.buildRadioVoiceChannelStatus(nowPlaying)
        : null;

      // Check if voice status or track info has changed since the last poll
      const voiceStatusChanged =
        !!radioVoiceChannelId &&
        (previousVoiceStatus !== nextVoiceStatus || // Status string changed
          previousVoiceChannelId !== radioVoiceChannelId); // Voice channel target changed

      // Check if track info has changed since the last poll by comparing snapshot keys
      const trackChanged = previousTrackSnapshotKey !== nextTrackSnapshotKey;

      if (!trackChanged && !voiceStatusChanged) {
        // Nothing changed, so skip sends/writes until the next poll tick.
        return;
      }

      let updatedNowPlayingMessageId = previousNowPlayingMessageId;

      // Send a embed message to the text channel when the track changes and message sending is enabled
      if (textChannel && shouldSendMessages && trackChanged) {
        const embed = buildRadioNowPlayingEmbed(nowPlaying);
        const sentMessage = await textChannel.send({embeds: [embed]});

        const previousMessageId = previousNowPlayingMessageId;
        if (previousMessageId && previousMessageId !== sentMessage.id) {
          await textChannel.messages
            .fetch(previousMessageId)
            .then(message => message.delete())
            .catch(() => {});
        }
        // Cache the ID of the currently sent message for cleanup on the next cycle when the track changes again.
        updatedNowPlayingMessageId = sentMessage.id;
      }

      // Update the voice channel status when it changes and a target channel is configured
      if (radioVoiceChannelId && nextVoiceStatus && voiceStatusChanged) {
        await this.updateRadioVoiceChannelStatus({
          channelId: radioVoiceChannelId,
          status: nextVoiceStatus,
        });
      }

      // Update the cached state for the next cycle's change detection
      this.radioPollingState = {
        previousTrackSnapshotKey: nextTrackSnapshotKey,
        previousNowPlayingMessageId: updatedNowPlayingMessageId,
        previousVoiceStatus: nextVoiceStatus,
        previousVoiceChannelId: radioVoiceChannelId ?? null,
      };
    } catch (error) {
      logger.warn('Failed polling radio now-playing metadata', {
        guildId: this.djmtGuild.guildId,
        statusUrl: this.radioStatusUrl,
        error,
      });
    }
  }

  /**
   * Builds a voice channel status string based on the currently playing radio track.
   * @param nowPlaying The currently playing radio track info used to build the status string.
   * @returns  A string to set as the voice channel status, truncated to 500 characters if needed.
   */
  private buildRadioVoiceChannelStatus(nowPlaying: {
    title: string | null;
    artist: string | null;
    rawTitle: string | null;
  }): string {
    const status =
      nowPlaying.title && nowPlaying.artist
        ? `${nowPlaying.title} - ${nowPlaying.artist}`
        : nowPlaying.title ||
          nowPlaying.artist ||
          nowPlaying.rawTitle ||
          'DJMuffinTops Radio';

    return status.length > 500 ? `${status.slice(0, 497)}...` : status;
  }

  /**
   * Writes the current track summary into a guild voice channel status.
   * Uses Discord's dedicated voice-status endpoint.
   */
  private async updateRadioVoiceChannelStatus(
    params: RadioVoiceStatusUpdate,
  ): Promise<void> {
    const {channelId, status} = params;
    const channel = this.djmtGuild.getGuildChannel(channelId);

    if (
      channel &&
      channel.type !== ChannelType.GuildVoice &&
      channel.type !== ChannelType.GuildStageVoice
    ) {
      logger.warn('Configured radio voice channel is not a voice channel', {
        guildId: this.djmtGuild.guildId,
        channelId,
        channelType: channel.type,
      });
      // Bail out when config points to an unsupported channel type.
      return;
    }

    try {
      await DJMTbot.getInstance().client.rest.put(
        `/channels/${channelId}/voice-status`,
        {
          body: {status: status ?? ''},
        },
      );
    } catch (error) {
      logger.warn('Failed updating radio voice channel status', {
        guildId: this.djmtGuild.guildId,
        channelId,
        status,
        error,
      });
    }
  }

  private async playFileCmd(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You must be in a voice channel to play music!',
        flags: ['Ephemeral'],
      });
      // File playback still requires the caller to provide the active voice context.
      return;
    }

    const attachment = interaction.options.getAttachment('file', true);

    // Validate file is an audio file
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.webm'];
    const isAudioFile = audioExtensions.some(ext =>
      attachment.name.toLowerCase().endsWith(ext),
    );

    if (!isAudioFile) {
      await interaction.reply({
        content:
          '❌ Please upload a valid audio file (mp3, wav, ogg, flac, m4a, webm)',
        flags: ['Ephemeral'],
      });
      // Reject unsupported files before we attempt to queue them.
      return;
    }

    await interaction.deferReply();

    try {
      // Use the Discord CDN URL to play the file
      await this.distube.play(voiceChannel, attachment.url, {
        textChannel: interaction.channel as GuildTextBasedChannel,
        member: member,
      });
      this.applySavedVolumePreference();
      logger.info('Playing music from file', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        fileName: attachment.name,
      });
      await interaction.editReply(`🎵 Playing file: **${attachment.name}**`);
    } catch (error) {
      logger.error('Error playing music from file', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        fileName: attachment.name,
        error,
      });
      await interaction.editReply(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /** Skips the current queue item when playback is active. */
  private async skipCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Skip is only valid when a queue exists.
      return;
    }

    try {
      await this.distube.skip(interaction.guildId!);
      await interaction.reply('⏭️ Skipped the current song');
    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: ['Ephemeral'],
      });
    }
  }

  /** Stops playback, clears queue state, and shuts down radio polling outputs. */
  private async stopCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Nothing to stop when no queue is active.
      return;
    }

    try {
      await queue.stop();
      this.stopRadioNowPlayingPolling();
      await interaction.reply('⏹️ Stopped playing and cleared the queue');
    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: ['Ephemeral'],
      });
    }
  }

  /** Leaves the voice channel and clears playback state for this guild. */
  private async leaveCmd(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: ['Ephemeral'],
      });
      // Leaving voice is a guild-scoped operation.
      return;
    }

    const queue = this.distube.getQueue(guildId);

    try {
      if (queue) {
        await queue.stop();
      }
      this.distube.voices.leave(guildId);
      this.stopRadioNowPlayingPolling();
      await interaction.reply(
        '👋 Left the voice channel and cleared the queue',
      );
    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: ['Ephemeral'],
      });
    }
  }

  /** Pauses the active queue when playback is currently running. */
  private async pauseCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Pause requires an active queue.
      return;
    }

    if (queue.paused) {
      await interaction.reply({
        content: '❌ The song is already paused!',
        flags: ['Ephemeral'],
      });
      // Avoid duplicate pause calls against already-paused playback.
      return;
    }

    await queue.pause();
    await interaction.reply('⏸️ Paused the current song');
  }

  /** Resumes the active queue when playback is currently paused. */
  private async resumeCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Resume requires an active queue.
      return;
    }

    if (!queue.paused) {
      await interaction.reply({
        content: '❌ The song is not paused!',
        flags: ['Ephemeral'],
      });
      // If playback is already running, resume has no effect.
      return;
    }

    await queue.resume();
    await interaction.reply('▶️ Resumed the current song');
  }

  /** Builds and returns an embed containing the current queue preview. */
  private async queueCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Queue output depends on an existing playback queue.
      return;
    }

    const songs = queue.songs;
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Current Queue')
      .setDescription(
        songs.length === 1
          ? 'Only one song in the queue'
          : `${songs.length} songs in queue`,
      );

    const queueList = songs
      .slice(0, 10)
      .map(
        (song: Song, index: number) =>
          `${index === 0 ? '🎵 **Now Playing:**' : `${index}.`} [${song.name}](${song.url}) - \`${song.formattedDuration}\``,
      )
      .join('\n');

    embed.addFields({name: 'Songs', value: queueList || 'No songs'});

    if (songs.length > 10) {
      embed.setFooter({text: `And ${songs.length - 10} more...`});
    }

    await interaction.reply({embeds: [embed]});
  }

  /**
   * Returns now-playing details for the active song.
   * Uses radio metadata when the current stream is the configured DJMT radio.
   */
  private async nowPlayingCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // No current track is available when queue is missing.
      return;
    }

    await interaction.deferReply();

    const song = queue.songs[0];

    try {
      const radioEmbed = await buildRadioNowPlayingEmbedForSong(song.url, {
        primaryUrl: this.radioPrimaryUrl,
        fallbackUrl: this.radioFallbackUrl,
        statusUrl: this.radioStatusUrl,
      });
      if (radioEmbed) {
        await interaction.editReply({embeds: [radioEmbed]});
        // Radio streams have dedicated metadata formatting; skip generic embed path.
        return;
      }
    } catch (error) {
      logger.warn('Failed to enrich now playing for radio stream', {
        guildId: interaction.guildId,
        songUrl: song.url,
        statusUrl: this.radioStatusUrl,
        error,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎵 Now Playing')
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        {name: 'Duration', value: song.formattedDuration, inline: true},
        {
          name: 'Requested by',
          value: song.user?.toString() ?? 'Unknown',
          inline: true,
        },
        {name: 'Volume', value: `${queue.volume}%`, inline: true},
        {
          name: 'Loop',
          value:
            queue.repeatMode === 2
              ? 'Queue'
              : queue.repeatMode === 1
                ? 'Song'
                : 'Off',
          inline: true,
        },
        {name: 'Autoplay', value: queue.autoplay ? 'On' : 'Off', inline: true},
        {name: 'Paused', value: queue.paused ? 'Yes' : 'No', inline: true},
      )
      .setThumbnail(song.thumbnail ?? null);

    await interaction.editReply({embeds: [embed]});
  }

  /** Sets live queue volume or stores a preference when no queue exists yet. */
  private async volumeCmd(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: ['Ephemeral'],
      });
      // Volume preferences are stored per guild.
      return;
    }

    const volume = interaction.options.getInteger('level', true);
    const queue = this.distube.getQueue(guildId);
    if (!queue) {
      this.volumePreference = volume;
      await this.djmtGuild.saveJSON();
      await interaction.reply({
        content: `🔊 Saved volume at ${volume}%. I will apply it when music is queued.`,
        flags: ['Ephemeral'],
      });
      // Persist preference now; it will be applied once playback starts.
      return;
    }

    queue.setVolume(volume);
    this.volumePreference = volume;
    await this.djmtGuild.saveJSON();
    await interaction.reply(`🔊 Volume set to ${volume}%`);
  }

  /** Sets repeat mode for the active queue. */
  private async loopCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Loop mode only applies to an active queue.
      return;
    }

    const mode = interaction.options.getString('mode', true);
    let repeatMode = 0;
    let modeText = 'Off';

    if (mode === 'song') {
      repeatMode = 1;
      modeText = 'Song';
    } else if (mode === 'queue') {
      repeatMode = 2;
      modeText = 'Queue';
    }

    queue.setRepeatMode(repeatMode);
    await interaction.reply(`🔁 Loop mode set to: ${modeText}`);
  }

  /** Toggles DisTube autoplay for the active queue. */
  private async autoplayCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      // Autoplay can only be toggled when queue state exists.
      return;
    }

    const autoplay = this.distube
      .getQueue(interaction.guildId!)
      ?.toggleAutoplay();
    await interaction.reply(
      `🎵 Autoplay is now ${autoplay ? 'enabled' : 'disabled'}`,
    );
  }
}
