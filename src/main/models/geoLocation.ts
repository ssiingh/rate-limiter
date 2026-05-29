export interface GeoLocation {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  source: 'geoip' | 'cdn_header' | 'unknown';
}
