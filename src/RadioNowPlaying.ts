import {EmbedBuilder} from 'discord.js';
import {request} from 'undici';
import {logger} from './Logger';

export const RADIO_PRIMARY_URL =
  'https://radio.djmuffintops.com/listen/radio/radio.mp3';
// Keep a fallback URL for the existing playback retry logic. AzuraCast's MP3
// endpoint is the canonical public stream URL for this station.
export const RADIO_FALLBACK_URL = RADIO_PRIMARY_URL;
export const RADIO_STATUS_URL =
  'https://radio.djmuffintops.com/api/nowplaying/radio';

type AzuraCastSong = {
  id?: string | number;
  title?: string;
  artist?: string;
  album?: string;
  album_id?: string | number;
  art?: string;
  custom_fields?: Record<string, string>;
};

type AzuraCastNowPlayingResponse = {
  station?: {name?: string; listen_url?: string};
  now_playing?: {
    song?: AzuraCastSong;
    elapsed?: number;
    duration?: number;
  };
  is_online?: boolean;
};

export type StreamMetadataPayload = {
  artist: string;
  albumartist: string;
  title: string;
  album: string;
  pretty: string;
  year: string;
  date: string;
  track: string;
  tracknumber: string;
  disc: string;
  discnumber: string;
  duration: string;
  length: string;
  tracklength: string;
  track_length: string;
};

const EMPTY_STREAM_METADATA: StreamMetadataPayload = {
  artist: '',
  albumartist: '',
  title: '',
  album: '',
  pretty: '',
  year: '',
  date: '',
  track: '',
  tracknumber: '',
  disc: '',
  discnumber: '',
  duration: '',
  length: '',
  tracklength: '',
  track_length: '',
};

export type RadioNowPlayingInfo = {
  title: string | null;
  artist: string | null;
  rawTitle: string | null;
  listenUrl: string | null;
  mountPath: string | null;
  metadataPayload: StreamMetadataPayload;
};

export type RadioNowPlayingConfig = {
  primaryUrl: string;
  fallbackUrl: string;
  statusUrl: string;
};

export function parseStreamMetadataPayload(
  rawTitle: string | null | undefined,
): StreamMetadataPayload {
  if (!rawTitle) {
    return EMPTY_STREAM_METADATA;
  }

  const params = new URLSearchParams(rawTitle);

  return {
    artist: params.get('artist') ?? '',
    albumartist: params.get('albumartist') ?? '',
    title: params.get('title') ?? '',
    album: params.get('album') ?? '',
    pretty: params.get('pretty') ?? '',
    year: params.get('year') ?? '',
    date: params.get('date') ?? '',
    track: params.get('track') ?? '',
    tracknumber: params.get('tracknumber') ?? '',
    disc: params.get('disc') ?? '',
    discnumber: params.get('discnumber') ?? '',
    duration: params.get('duration') ?? '',
    length: params.get('length') ?? '',
    tracklength: params.get('tracklength') ?? '',
    track_length: params.get('track_length') ?? '',
  };
}

export function getPathFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return null;
  }
}

function formatDurationFromMetadata(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.includes(':')) {
    return value;
  }

  const totalMs = Number(value);
  if (!Number.isFinite(totalMs) || totalMs < 0) {
    return value;
  }

  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function isRadioStreamUrl(
  url: string | null | undefined,
  primaryUrl: string,
  fallbackUrl: string,
): boolean {
  if (!url) {
    return false;
  }

  const currentPath = getPathFromUrl(url);
  const primaryPath = getPathFromUrl(primaryUrl);
  const fallbackPath = getPathFromUrl(fallbackUrl);

  if (!currentPath || !primaryPath || !fallbackPath) {
    return false;
  }

  return currentPath === primaryPath || currentPath === fallbackPath;
}

export async function fetchRadioNowPlaying(
  config: RadioNowPlayingConfig,
): Promise<RadioNowPlayingInfo | null> {
  const {body, statusCode} = await request(config.statusUrl, {
    method: 'GET',
  });

  if (statusCode !== 200) {
    body.destroy();
    throw new Error(`AzuraCast now-playing endpoint returned ${statusCode}`);
  }

  const response = (await body.json()) as AzuraCastNowPlayingResponse;
  const song = response.now_playing?.song;
  if (!song) {
    return null;
  }

  logger.debug('Fetched radio now-playing info', {
    response,
  });

  const title = song.title?.trim() || null;
  const artist = song.artist?.trim() || null;
  const metadataPayload: StreamMetadataPayload = {
    ...EMPTY_STREAM_METADATA,
    title: title ?? '',
    artist: artist ?? '',
    album: song.album?.trim() ?? '',
    // AzuraCast reports duration in seconds; the embed formatter accepts ms.
    duration:
      typeof response.now_playing?.duration === 'number'
        ? (response.now_playing.duration * 1000).toString()
        : '',
  };
  const listenUrl = config.primaryUrl;
  const mountPath = listenUrl ? getPathFromUrl(listenUrl) : null;

  return {
    title,
    artist,
    rawTitle: title,
    listenUrl,
    mountPath,
    metadataPayload,
  };
}

export function buildRadioNowPlayingEmbed(
  nowPlaying: RadioNowPlayingInfo,
  stationName = 'DjMuffinTops Radio',
  publicUrl?: string,
): EmbedBuilder {
  const fields: {name: string; value: string; inline: boolean}[] = [];
  const addField = (name: string, value: string | null, inline = true) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      return;
    }
    fields.push({name, value: trimmedValue, inline});
  };

  addField('Track', nowPlaying.title, false);
  addField('Album', nowPlaying.metadataPayload.album);
  addField('Artist', nowPlaying.artist);
  addField(
    'Track Length',
    formatDurationFromMetadata(
      nowPlaying.metadataPayload.duration ||
        nowPlaying.metadataPayload.tracklength ||
        nowPlaying.metadataPayload.track_length ||
        nowPlaying.metadataPayload.length,
    ),
  );
  addField('Album Artist', nowPlaying.metadataPayload.albumartist);
  addField('Year', nowPlaying.metadataPayload.year);
  addField('Date', nowPlaying.metadataPayload.date);
  addField(
    'Disc Number',
    nowPlaying.metadataPayload.discnumber || nowPlaying.metadataPayload.disc,
  );
  addField(
    'Track Number',
    nowPlaying.metadataPayload.tracknumber || nowPlaying.metadataPayload.track,
  );
  const visitUrl = publicUrl || nowPlaying.listenUrl;
  if (visitUrl) {
    // Keep the browser link at the bottom of the embed rather than placing
    // descriptive text over the main embed content.
    addField('Public Page • Song Requests', `[${visitUrl}](${visitUrl})`, false);
  }
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`📻 ${stationName}`);

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

export async function buildRadioNowPlayingEmbedForSong(
  songUrl: string | null | undefined,
  config: RadioNowPlayingConfig,
): Promise<EmbedBuilder | null> {
  if (!isRadioStreamUrl(songUrl, config.primaryUrl, config.fallbackUrl)) {
    return null;
  }

  const radioNowPlaying = await fetchRadioNowPlaying(config);
  if (!radioNowPlaying) {
    return null;
  }

  return buildRadioNowPlayingEmbed(radioNowPlaying);
}
