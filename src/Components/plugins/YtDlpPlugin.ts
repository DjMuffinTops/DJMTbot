import {ExtractorPlugin, ResolveOptions, Song} from 'distube';
import {execFile, spawn} from 'node:child_process';
import {createServer, IncomingMessage, ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {logger} from '../../Logger';

const execFileAsync = promisify(execFile);

const YOUTUBE_URL =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i;

interface YtDlpMetadata {
  id: string;
  title?: string;
  webpage_url?: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  channel?: string;
}

/** DisTube extractor backed by the yt-dlp executable. */
export class YtDlpPlugin extends ExtractorPlugin {
  private streamServer: ReturnType<typeof createServer> | undefined;
  private streamUrls = new Map<string, string>();
  private metadataCache = new Map<
    string,
    {metadata: YtDlpMetadata; expiresAt: number}
  >();
  private streamPortPromise: Promise<number> | undefined;
  private readonly metadataCacheDurationMs = 10 * 60 * 1000;
  validate(url: string): boolean {
    return YOUTUBE_URL.test(url);
  }

  async resolve<T>(url: string, options: ResolveOptions<T>): Promise<Song<T>> {
    const videoId = url.match(YOUTUBE_URL)?.[1];
    if (!videoId) throw new Error('Could not extract a YouTube video ID');
    return this.createSong(await this.getMetadata(url), options);
  }

  async searchSong<T>(
    _query: string,
    _options: ResolveOptions<T>,
  ): Promise<Song<T> | null> {
    return null;
  }

  async getStreamURL<T>(song: Song<T>): Promise<string> {
    const url = song.url ?? `https://www.youtube.com/watch?v=${song.id}`;
    const port = await this.getStreamPort();
    const token = randomUUID();
    this.streamUrls.set(token, url);
    setTimeout(() => this.streamUrls.delete(token), 10 * 60 * 1000);
    return `http://127.0.0.1:${port}/stream/${token}`;
  }

  async getRelatedSongs<T>(): Promise<Song<T>[]> {
    return [];
  }

  private async getMetadata(input: string): Promise<YtDlpMetadata> {
    const cached = this.metadataCache.get(input);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.metadata;
    }

    const {stdout} = await execFileAsync('yt-dlp', [
      '--no-playlist',
      '--extractor-args',
      'youtube:player_client=mweb',
      '--dump-single-json',
      '--skip-download',
      input,
    ]);
    const metadata = JSON.parse(stdout) as YtDlpMetadata;
    this.metadataCache.set(input, {
      metadata,
      expiresAt: Date.now() + this.metadataCacheDurationMs,
    });
    return metadata;
  }

  private getStreamPort(): Promise<number> {
    this.streamPortPromise ??= new Promise((resolve, reject) => {
      this.streamServer = createServer((request, response) => {
        void this.proxyStream(request, response);
      });
      this.streamServer.once('error', reject);
      this.streamServer.listen(0, '127.0.0.1', () => {
        const address = this.streamServer?.address();
        if (address && typeof address !== 'string') resolve(address.port);
        else reject(new Error('Could not start the YouTube stream proxy'));
      });
    });
    return this.streamPortPromise;
  }

  private async proxyStream(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const token = request.url?.match(/^\/stream\/([^/?]+)/)?.[1];
    const streamUrl = token ? this.streamUrls.get(token) : undefined;
    if (!streamUrl) {
      response.writeHead(404).end();
      return;
    }

    try {
      // YouTube rejects the signed URL when FFmpeg's Range header is forwarded.
      // Fetch the full upstream stream and let the local proxy serve it to FFmpeg.
      const downloader = spawn('yt-dlp', [
        '--no-playlist',
        '--extractor-args',
        'youtube:player_client=mweb',
        '--format',
        'bestaudio/best',
        '--output',
        '-',
        streamUrl,
      ]);
      logger.info('YouTube stream proxy started', {
        source: streamUrl,
        range: request.headers.range,
      });
      response.writeHead(200, {'Content-Type': 'audio/webm'});
      downloader.stdout.pipe(response);
      downloader.stderr.on('data', data =>
        logger.debug('yt-dlp stream output', {output: data.toString().trim()}),
      );
      downloader.on('error', error => response.destroy(error));
      downloader.on('close', code => {
        if (code !== 0) {
          logger.warn('yt-dlp stream exited unexpectedly', {code});
        }
      });
      response.on('close', () => downloader.kill());
    } catch (error) {
      logger.error('YouTube stream proxy failed', {
        error: error instanceof Error ? error.message : String(error),
        range: request.headers.range,
      });
      if (!response.headersSent) response.writeHead(502);
      response.end();
    }
  }

  private createSong<T>(
    info: YtDlpMetadata,
    options: ResolveOptions<T>,
  ): Song<T> {
    if (!info.id) throw new Error('yt-dlp response did not include a video ID');
    return new Song<T>(
      {
        plugin: this,
        source: 'youtube',
        playFromSource: true,
        id: info.id,
        name: info.title,
        url: info.webpage_url ?? `https://www.youtube.com/watch?v=${info.id}`,
        duration: info.duration ?? 0,
        thumbnail: info.thumbnail,
        uploader: {name: info.uploader ?? info.channel},
      },
      options,
    );
  }
}
