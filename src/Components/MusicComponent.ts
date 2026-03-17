import {
  ChatInputCommandInteraction,
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
import {request} from 'undici';
import {DisTube, Song} from 'distube';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {Component} from '../Component';
import {ComponentNames} from '../Constants/ComponentNames';
import {DJMTbot} from '../DJMTbot';
import {logger} from '../Logger';

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
  .setDescription('Play DJMuffinTops radio');

const radioNowPlayingCommand = new SlashCommandBuilder()
  .setName(ComponentCommands.RADIO_NOWPLAYING)
  .setDescription('Show what is currently playing on DJMuffinTops radio');

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

type IcecastSource = {
  listenurl?: string;
  title?: string;
  song?: string;
  artist?: string;
};

type IcecastStatusResponse = {
  icestats?: {
    source?: IcecastSource | IcecastSource[];
  };
};

export class MusicComponent extends Component<MusicComponentSave> {
  private readonly radioPrimaryUrl =
    'https://radio.djmuffintops.com/RoluFM.ogg';
  private readonly radioFallbackUrl =
    'https://radio.djmuffintops.com/RoluFM.mp3';
  private readonly radioStatusUrl =
    'https://radio.djmuffintops.com/status-json.xsl';
  private volumePreference: number | null = null;

  name: ComponentNames = ComponentNames.MUSIC;
  commands = [
    playCommand,
    radioCommand,
    radioNowPlayingCommand,
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

  getSaveData(): Promise<MusicComponentSave> {
    return Promise.resolve({
      volume: this.volumePreference,
    });
  }

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

  async onReady(): Promise<void> {
    return Promise.resolve();
  }

  private applySavedVolumePreference(): void {
    if (this.volumePreference === null) {
      return;
    }

    try {
      this.distube.setVolume(this.djmtGuild.guildId, this.volumePreference);
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

  onMessageCreate(_args: string[], _message: Message): Promise<void> {
    return Promise.resolve();
  }

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
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

    const commandName = interaction.commandName;

    switch (commandName) {
      case ComponentCommands.PLAY:
        await this.playCmd(interaction);
        break;
      case ComponentCommands.RADIO:
        await this.radioCmd(interaction);
        break;
      case ComponentCommands.RADIO_NOWPLAYING:
        await this.radioNowPlayingCmd(interaction);
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

  private async radioCmd(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '❌ You must be in a voice channel to play music!',
        flags: ['Ephemeral'],
      });
      return;
    }

    await interaction.deferReply();

    const playOptions = {
      textChannel: interaction.channel as GuildTextBasedChannel,
      member: member,
    };

    try {
      await this.distube.play(voiceChannel, this.radioPrimaryUrl, playOptions);
      this.applySavedVolumePreference();
      logger.info('Playing radio stream', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        url: this.radioPrimaryUrl,
      });
      await interaction.editReply('📻 Playing DJMuffinTops radio.');
      return;
    } catch (primaryError) {
      logger.warn('Primary radio stream failed, attempting fallback', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        primaryUrl: this.radioPrimaryUrl,
        fallbackUrl: this.radioFallbackUrl,
        error: primaryError,
      });
    }

    try {
      await this.distube.play(voiceChannel, this.radioFallbackUrl, playOptions);
      this.applySavedVolumePreference();
      logger.info('Playing fallback radio stream', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        url: this.radioFallbackUrl,
      });
      await interaction.editReply('📻 Playing DJMuffinTops radio.');
    } catch (fallbackError) {
      logger.error('Radio stream failed for both primary and fallback URLs', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        primaryUrl: this.radioPrimaryUrl,
        fallbackUrl: this.radioFallbackUrl,
        error: fallbackError,
      });
      await interaction.editReply(
        `❌ Could not start radio stream. ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
      );
    }
  }

  private getPathFromUrl(url: string): string | null {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return null;
    }
  }

  private async fetchRadioNowPlaying(): Promise<string | null> {
    const primaryMount = this.getPathFromUrl(this.radioPrimaryUrl);
    const fallbackMount = this.getPathFromUrl(this.radioFallbackUrl);

    if (!primaryMount || !fallbackMount) {
      return null;
    }

    const mounts = new Set([primaryMount, fallbackMount]);
    const {body, statusCode} = await request(this.radioStatusUrl, {
      method: 'GET',
    });

    if (statusCode !== 200) {
      body.destroy();
      throw new Error(`Icecast status endpoint returned ${statusCode}`);
    }

    const response = (await body.json()) as IcecastStatusResponse;
    const sourceField = response.icestats?.source;
    const sources = Array.isArray(sourceField)
      ? sourceField
      : sourceField
        ? [sourceField]
        : [];

    const selectedSource =
      sources.find(source => {
        if (!source.listenurl) {
          return false;
        }
        const mountPath = this.getPathFromUrl(source.listenurl);
        return mountPath ? mounts.has(mountPath) : false;
      }) ?? sources[0];

    if (!selectedSource) {
      return null;
    }

    if (selectedSource.artist?.trim() && selectedSource.title?.trim()) {
      return `${selectedSource.artist.trim()} - ${selectedSource.title.trim()}`;
    }

    if (selectedSource.title?.trim()) {
      return selectedSource.title.trim();
    }

    if (selectedSource.song?.trim()) {
      return selectedSource.song.trim();
    }

    return null;
  }

  private async radioNowPlayingCmd(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const nowPlaying = await this.fetchRadioNowPlaying();

      if (!nowPlaying) {
        await interaction.editReply(
          '📻 DJMuffinTops radio is online, but track metadata is not currently available.',
        );
        return;
      }

      await interaction.editReply(
        `📻 DJMuffinTops radio now playing: **${nowPlaying}**`,
      );
    } catch (error) {
      logger.warn('Failed to fetch radio now playing metadata', {
        userId: interaction.member?.user.id,
        username: interaction.member?.user.username,
        statusUrl: this.radioStatusUrl,
        error,
      });
      await interaction.editReply(
        '❌ Could not fetch radio now playing info right now. Please try again in a bit.',
      );
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

  private async skipCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
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

  private async stopCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      return;
    }

    try {
      await this.distube.stop(interaction.guildId!);
      await interaction.reply('⏹️ Stopped playing and cleared the queue');
    } catch (error) {
      await interaction.reply({
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: ['Ephemeral'],
      });
    }
  }

  private async leaveCmd(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: ['Ephemeral'],
      });
      return;
    }

    const queue = this.distube.getQueue(guildId);

    try {
      if (queue) {
        await this.distube.stop(guildId);
      }
      this.distube.voices.leave(guildId);
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

  private async pauseCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      return;
    }

    if (queue.paused) {
      await interaction.reply({
        content: '❌ The song is already paused!',
        flags: ['Ephemeral'],
      });
      return;
    }

    await this.distube.pause(interaction.guildId!);
    await interaction.reply('⏸️ Paused the current song');
  }

  private async resumeCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      return;
    }

    if (!queue.paused) {
      await interaction.reply({
        content: '❌ The song is not paused!',
        flags: ['Ephemeral'],
      });
      return;
    }

    await this.distube.resume(interaction.guildId!);
    await interaction.reply('▶️ Resumed the current song');
  }

  private async queueCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
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

  private async nowPlayingCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
      return;
    }

    const song = queue.songs[0];
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

    await interaction.reply({embeds: [embed]});
  }

  private async volumeCmd(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: ['Ephemeral'],
      });
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
      return;
    }

    this.distube.setVolume(guildId, volume);
    this.volumePreference = volume;
    await this.djmtGuild.saveJSON();
    await interaction.reply(`🔊 Volume set to ${volume}%`);
  }

  private async loopCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
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

    this.distube.setRepeatMode(interaction.guildId!, repeatMode);
    await interaction.reply(`🔁 Loop mode set to: ${modeText}`);
  }

  private async autoplayCmd(interaction: ChatInputCommandInteraction) {
    const queue = this.distube.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({
        content: '❌ Nothing is playing!',
        flags: ['Ephemeral'],
      });
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
