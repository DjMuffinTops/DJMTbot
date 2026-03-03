import Discord, {
  Client,
  GuildMember,
  GatewayIntentBits,
  Partials,
  Message,
  User,
  VoiceState,
  Events,
  EmbedBuilder,
} from 'discord.js';
import {DisTube, Events as DistubeEvents, Queue, Song, Playlist} from 'distube';
import {FilePlugin} from '@distube/file';
import {DirectLinkPlugin} from '@distube/direct-link';
import {promises as FileSystem} from 'fs';
import {DJMTGuild} from './DJMTGuild';
import {Cron} from './Cron';
import {logger} from './Logger';
import dotenv from 'dotenv';
// Here we load the guildConfigs.json file that contains our token and our prefix values.
dotenv.config();
Cron.getInstance();

export class DJMTbot {
  private static instance: DJMTbot;
  client: Client;
  distube: DisTube;
  guilds: Map<string, DJMTGuild>;
  private constructor() {
    this.client = new Discord.Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildModeration,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
    // Initialize DistTube music player with plugins:
    // - FilePlugin: Plays audio files uploaded to Discord
    // - DirectLinkPlugin: Plays direct audio file URLs (mp3, wav, ogg, etc.)
    // DistTube also supports YouTube and SoundCloud natively
    this.distube = new DisTube(this.client, {
      emitNewSongOnly: true,
      emitAddSongWhenCreatingQueue: false,
      emitAddListWhenCreatingQueue: false,
      plugins: [new FilePlugin(), new DirectLinkPlugin()],
    });
    this.setupDistubeEvents();
    this.guilds = new Map<string, DJMTGuild>();
    void this.initGuildInstancesFromFiles()
      .then(() => logger.info(`${this.guilds.size} DJMT Guilds Initialized`))
      .catch((err: unknown) =>
        logger.error('Failed initializing guild instances', {error: err}),
      );
  }

  public static getInstance(): DJMTbot {
    if (!DJMTbot.instance) {
      DJMTbot.instance = new DJMTbot();
    }
    return DJMTbot.instance;
  }

  /**
   * Sets up DisTube event handlers for music playback
   * @private
   */
  private setupDistubeEvents(): void {
    this.distube.on(DistubeEvents.PLAY_SONG, (queue: Queue, song: Song) => {
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
        )
        .setThumbnail(song.thumbnail ?? null);

      queue.textChannel?.send({embeds: [embed]}).catch(() => {});
    });

    this.distube.on(DistubeEvents.ADD_SONG, (queue: Queue, song: Song) => {
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('➕ Added to Queue')
        .setDescription(`[${song.name}](${song.url})`)
        .addFields(
          {name: 'Duration', value: song.formattedDuration, inline: true},
          {
            name: 'Position in queue',
            value: `${queue.songs.length}`,
            inline: true,
          },
        )
        .setThumbnail(song.thumbnail ?? null);

      queue.textChannel?.send({embeds: [embed]}).catch(() => {});
    });

    this.distube.on(
      DistubeEvents.ADD_LIST,
      (queue: Queue, playlist: Playlist) => {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('📝 Added Playlist to Queue')
          .setDescription(`[${playlist.name}](${playlist.url ?? 'N/A'})`)
          .addFields({
            name: 'Songs',
            value: `${playlist.songs.length}`,
            inline: true,
          });

        queue.textChannel?.send({embeds: [embed]}).catch(() => {});
      },
    );

    this.distube.on(DistubeEvents.ERROR, (error: Error) => {
      logger.error('DisTube Error', {error});
      throw error;
    });

    this.distube.on(DistubeEvents.FINISH, (queue: Queue) => {
      queue.textChannel?.send('✅ Queue finished!').catch(() => {});
    });

    this.distube.on(DistubeEvents.DISCONNECT, (queue: Queue) => {
      queue.textChannel
        ?.send('👋 Disconnected from voice channel')
        .catch(() => {});
    });
  }

  /**
   * Parses the GUILD_IDS environment variable to get a set of allowed guild IDs.
   *
   * Supports two formats:
   * - Comma-separated: `GUILD_IDS=123,456,789`
   * - JSON array: `GUILD_IDS="[\"123\",\"456\",\"789\"]"`
   *
   * @returns A Set of allowed guild IDs, or null if GUILD_IDS env var is not set
   *          (null means all guilds are allowed)
   */
  private getAllowedGuildIds(): Set<string> | null {
    const guildIdsEnv = process.env.GUILD_IDS;
    if (!guildIdsEnv) {
      return null; // No restriction, use all guilds
    }

    try {
      // Try parsing as JSON array first
      const parsed = JSON.parse(guildIdsEnv);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(id => String(id)));
      }
    } catch {
      // Not JSON, treat as comma-separated string
    }

    // Parse as comma-separated string
    const ids = guildIdsEnv
      .split(',')
      .map(id => id.trim())
      .filter(id => id);
    return new Set(ids);
  }

  private async initGuildInstancesFromFiles(): Promise<void> {
    const allowedIds = this.getAllowedGuildIds();
    const filenames = await FileSystem.readdir('./json/guilds');
    const guildIds = filenames
      .map(filename => filename.substr(0, filename.indexOf('.')))
      .filter(id => !allowedIds || allowedIds.has(id));

    for (const id of guildIds) {
      this.createGuild(id);
    }
  }

  async run() {
    this.client.on(Events.ClientReady, () => {
      void (async () => {
        const allowedIds = this.getAllowedGuildIds();

        // Make guild instances for guilds we didnt have a file for
        for (const cachedGuild of [...this.client.guilds.cache.values()]) {
          const guildId = cachedGuild.id;

          // Skip if guild is not in allowed list
          if (allowedIds && !allowedIds.has(guildId)) {
            continue;
          }

          this.createGuild(guildId);
        }
        this.client?.user?.setActivity('@DJMTbot for help!');
        // Ready all guild instances
        for (const id of Array.from(this.guilds.keys())) {
          await this.guilds.get(id)?.onReady();
        }
        logger.info('DJMTbot is ready!');
      })().catch((err: unknown) =>
        logger.error('ClientReady handler error', {error: err}),
      );
    });

    this.client.on(Events.GuildMemberAdd, (member: GuildMember) => {
      void (async () => {
        const guild = this.guilds.get(member.guild?.id || '');
        if (guild) {
          await guild.onGuildMemberAdd(member);
        } else {
          logger.warn('Member does not have an associated guild instance', {
            memberId: member.id,
          });
        }
      })().catch((err: unknown) =>
        logger.error('GuildMemberAdd handler error', {error: err}),
      );
    });

    this.client.on(Events.MessageCreate, (message: Message) => {
      void (async () => {
        if (message.author.bot) return; // Ignore bot messages
        const args: string[] = message.content.trim().split(/ +/g);
        const guild = this.guilds.get(message.guild?.id || '');
        if (guild) {
          await guild.onMessageCreate(args, message);
        } else {
          logger.warn('Message does not have an associated guild instance', {
            messageId: message.id,
            messageContent: message.content,
          });
        }
      })().catch((err: unknown) =>
        logger.error('MessageCreate handler error', {error: err}),
      );
    });

    this.client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
      void (async () => {
        const guild = this.guilds.get(newMessage.guild?.id || '');
        if (guild) {
          await guild.onMessageUpdate(
            oldMessage as Message,
            newMessage as Message,
          );
        } else {
          logger.warn('NewMessage does not have an associated guild instance', {
            messageId: newMessage.id,
          });
        }
      })().catch((err: unknown) =>
        logger.error('MessageUpdate handler error', {error: err}),
      );
    });

    this.client.on(
      Events.VoiceStateUpdate,
      (oldState: VoiceState, newState: VoiceState) => {
        void (async () => {
          const guild = this.guilds.get(newState.guild?.id || '');
          if (guild) {
            await guild.onVoiceStateUpdate(oldState, newState);
          } else {
            logger.warn('newState does not have an associated guild instance', {
              guildId: newState.guild?.id,
            });
          }
        })().catch((err: unknown) =>
          logger.error('VoiceStateUpdate handler error', {error: err}),
        );
      },
    );

    this.client.on(Events.MessageReactionAdd, (messageReaction, user) => {
      void (async () => {
        // When we receive a reaction we check if the reaction is partial or not
        if (messageReaction.partial) {
          // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
          try {
            await messageReaction.fetch();
          } catch (error) {
            logger.error('Something went wrong when fetching the message', {
              error,
            });
            return;
          }
        }
        const guild = this.guilds.get(messageReaction.message.guild?.id || '');
        if (!messageReaction.partial && guild) {
          await guild.onMessageReactionAdd(messageReaction, user as User);
        } else {
          logger.warn('Reaction does not have an associated guild instance', {
            messageId: messageReaction.message.id,
          });
        }
      })().catch((err: unknown) =>
        logger.error('MessageReactionAdd handler error', {error: err}),
      );
    });

    this.client.on(Events.MessageReactionRemove, (messageReaction, user) => {
      void (async () => {
        // When we receive a reaction we check if the reaction is partial or not
        if (messageReaction.partial) {
          // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
          try {
            await messageReaction.fetch();
          } catch (error) {
            logger.error('Something went wrong when fetching the message', {
              error,
            });
            return;
          }
        }
        const guild = this.guilds.get(messageReaction.message.guild?.id || '');
        if (!messageReaction.partial && guild) {
          await guild.onMessageReactionRemove(messageReaction, user as User);
        } else {
          logger.warn('Reaction does not have an associated guild instance', {
            messageId: messageReaction.message.id,
          });
        }
      })().catch((err: unknown) =>
        logger.error('MessageReactionRemove handler error', {error: err}),
      );
    });

    this.client.on(Events.InteractionCreate, interaction => {
      void (async () => {
        const guild = this.guilds.get(interaction.guild?.id || '');
        if (guild) {
          await guild.onInteractionCreate(interaction);
        } else {
          logger.warn(
            'Interaction does not have an associated guild instance',
            {guildId: interaction.guild?.id},
          );
        }
      })().catch((err: unknown) =>
        logger.error('InteractionCreate handler error', {error: err}),
      );
    });

    this.client.on(Events.GuildCreate, guild => {
      const newGuild = this.createGuild(guild.id);
      if (newGuild) {
        void newGuild.onReady();
      }
      logger.info('New guild joined', {
        guildName: guild.name,
        guildId: guild.id,
        memberCount: guild.memberCount,
      });
    });

    this.client.on(Events.GuildDelete, guild => {
      logger.info('Removed from guild', {
        guildName: guild.name,
        guildId: guild.id,
      });
    });

    await this.client.login(process.env.TOKEN);
  }

  /**
   * Creates a guild instance for the given guild ID if it doesn't already exist.
   * @param guildId The ID of the guild to create an instance for
   * @returns The created DJMTGuild instance, or undefined if it already existed
   */
  private createGuild(guildId: string) {
    if (!this.guilds.get(guildId)) {
      const guild = new DJMTGuild(guildId);
      this.guilds.set(guildId, guild);
      return guild;
    }
  }
}
