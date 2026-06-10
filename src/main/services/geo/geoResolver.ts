import geoip from 'geoip-lite';
import { Request } from 'express';
import { globalCache } from '../cache/localCache';
import { CACHE_TTL, HEADERS } from '../../utils/constants';
import type { GeoLocation } from '../../models';

export class GeoResolver {
  resolve(ip: string, req?: Request): GeoLocation {
    // Check CDN headers first (more accurate)
    if (req) {
      const cfCountry = req.headers[HEADERS.CF_IP_COUNTRY.toLowerCase()] as string;
      if (cfCountry && cfCountry !== 'XX') {
        return { ip, country: cfCountry, source: 'cdn_header' };
      }
      const cfViewerCountry = req.headers[HEADERS.CLOUDFRONT_VIEWER_COUNTRY.toLowerCase()] as string;
      if (cfViewerCountry) {
        return { ip, country: cfViewerCountry, source: 'cdn_header' };
      }
    }

    // Check cache
    const cached = globalCache.get<GeoLocation>(`geo:${ip}`);
    if (cached) return cached;

    // GeoIP lookup
    const geo = geoip.lookup(ip);
    const result: GeoLocation = {
      ip,
      country: geo?.country,
      region: geo?.region,
      city: geo?.city,
      latitude: geo?.ll?.[0],
      longitude: geo?.ll?.[1],
      source: geo ? 'geoip' : 'unknown',
    };

    globalCache.set(`geo:${ip}`, result, CACHE_TTL.GEO_LOOKUP);
    return result;
  }
}

export const geoResolver = new GeoResolver();
export default GeoResolver;
