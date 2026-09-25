import {request} from 'undici';
import {DirectLinkPlugin} from '@distube/direct-link';

const VALID_CONTENT_TYPES = ['audio/', 'video/', 'application/'];

function checkContentType(type: string | string[] | undefined): boolean {
  const t = Array.isArray(type) ? type[0] : type;
  return VALID_CONTENT_TYPES.some(s => t?.startsWith(s));
}

/**
 * Extends DirectLinkPlugin with Icecast compatibility.
 *
 * Icecast (and similar streaming servers) reject HEAD requests with 400, but
 * respond normally to GET. The stock DirectLinkPlugin only tries HEAD and
 * rejects any non-200 response, so Icecast mountpoints are silently refused.
 *
 * This plugin falls back to a GET request (with Range: bytes=0-0 to minimise
 * data transfer) when HEAD returns a non-200 status or throws.
 */
export class IcecastDirectLinkPlugin extends DirectLinkPlugin {
  override async validate(url: string): Promise<boolean> {
    // Fast path: standard HEAD check (works for CDN / Discord attachment URLs)
    try {
      const {headers, statusCode} = await request(url, {method: 'HEAD'});
      if (statusCode === 200 && checkContentType(headers['content-type'])) {
        return true;
      }
    } catch {
      // Network error on HEAD — fall through to GET
    }

    // Fallback GET for Icecast and other servers that reject HEAD.
    // Range: bytes=0-0 asks for only the first byte so we don't buffer a live
    // stream, though Icecast will often ignore Range and return 200 anyway.
    try {
      const {headers, statusCode, body} = await request(url, {
        method: 'GET',
        headers: {Range: 'bytes=0-0'},
      });
      // Discard the body immediately — we only needed the response headers.
      body.destroy();

      if (
        (statusCode === 200 || statusCode === 206) &&
        checkContentType(headers['content-type'])
      ) {
        return true;
      }
    } catch {
      // GET also failed — not a playable URL
    }

    return false;
  }
}
