import {EmbedBuilder} from 'discord.js';
import {request} from 'undici';
import {logger} from './Logger';

export const RADIO_PRIMARY_URL = 'https://radio.djmuffintops.com/RoluFM.ogg';
export const RADIO_FALLBACK_URL = 'https://radio.djmuffintops.com/RoluFM.mp3';
export const RADIO_STATUS_URL =
  'https://radio.djmuffintops.com/status-json.xsl';

type IcecastSource = {
  listenurl?: string;
  title?: string;
  artist?: string;
};

type IcecastStatusResponse = {
  icestats?: {
    source?: IcecastSource | IcecastSource[];
  };
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

function hasAnyMetadataValue(payload: StreamMetadataPayload): boolean {
  return Object.values(payload).some(value => value.trim().length > 0);
}

function isQueryStringLike(value: string): boolean {
  return value.includes('=') && value.includes('&');
}

export function getPathFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return null;
  }
}

function stripPortFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.port = '';
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
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
  const primaryMount = getPathFromUrl(config.primaryUrl);
  const fallbackMount = getPathFromUrl(config.fallbackUrl);

  if (!primaryMount || !fallbackMount) {
    return null;
  }

  const {body, statusCode} = await request(config.statusUrl, {
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

  const getSourceByMount = (mount: string): IcecastSource | undefined =>
    sources.find(source => {
      if (!source.listenurl) {
        return false;
      }
      return getPathFromUrl(source.listenurl) === mount;
    });

  const selectedSource =
    getSourceByMount(primaryMount) ??
    getSourceByMount(fallbackMount) ??
    sources[0];

  if (!selectedSource) {
    return null;
  }

  logger.debug('Fetched radio now-playing info', {
    selectedSource,
  });

  const rawTitle = selectedSource.title?.trim() || null;
  const metadataPayload = parseStreamMetadataPayload(rawTitle);
  const metadataTitle =
    metadataPayload.title || metadataPayload.pretty || metadataPayload.track;
  const rawTitleFallback =
    rawTitle &&
    (!isQueryStringLike(rawTitle) || hasAnyMetadataValue(metadataPayload))
      ? rawTitle
      : null;
  const title = metadataTitle || rawTitleFallback || null;
  const artist =
    metadataPayload.artist || selectedSource.artist?.trim() || null;
  // Icecast currently reports an incorrect port in listenurl; drop only the port.
  const listenUrl = selectedSource.listenurl?.trim()
    ? stripPortFromUrl(selectedSource.listenurl.trim())
    : null;
  const mountPath = listenUrl ? getPathFromUrl(listenUrl) : null;

  return {
    title,
    artist,
    rawTitle,
    listenUrl,
    mountPath,
    metadataPayload,
  };
}

export function buildRadioNowPlayingEmbed(
  nowPlaying: RadioNowPlayingInfo,
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
  addField('Artist', nowPlaying.artist);
  addField('Album', nowPlaying.metadataPayload.album);
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
  addField('Mount', nowPlaying.mountPath);

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📻 DjMuffinTops Radio')
    .setFooter({text: `${nowPlaying.listenUrl}`});

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (nowPlaying.listenUrl) {
    embed.setURL(nowPlaying.listenUrl);
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
