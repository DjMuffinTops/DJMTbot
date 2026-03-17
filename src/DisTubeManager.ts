import {Client, EmbedBuilder} from 'discord.js';
import {DisTube, Events as DistubeEvents, Playlist, Queue, Song} from 'distube';
import {DirectLinkPlugin} from '@distube/direct-link';
import {FilePlugin} from '@distube/file';
import {logger} from './Logger';

export class DisTubeManager {
  readonly player: DisTube;

  constructor(client: Client) {
    this.player = new DisTube(client, {
      emitNewSongOnly: true,
      emitAddSongWhenCreatingQueue: false,
      emitAddListWhenCreatingQueue: false,
      plugins: [new FilePlugin(), new DirectLinkPlugin()],
    });

    this.setupEvents();
  }

  private setupEvents(): void {
    this.player.on(DistubeEvents.PLAY_SONG, (queue: Queue, song: Song) => {
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

    this.player.on(DistubeEvents.ADD_SONG, (queue: Queue, song: Song) => {
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

    this.player.on(
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

    this.player.on(DistubeEvents.ERROR, (error: Error) => {
      logger.error('DisTube Error', {error});
      throw error;
    });

    this.player.on(DistubeEvents.FINISH, (queue: Queue) => {
      queue.textChannel?.send('✅ Queue finished!').catch(() => {});
    });

    this.player.on(DistubeEvents.DISCONNECT, (queue: Queue) => {
      queue.textChannel
        ?.send('👋 Disconnected from voice channel')
        .catch(() => {});
    });
  }
}
