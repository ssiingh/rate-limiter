import { Request } from 'express';
import geoConfig from '../../config/geoConfig';
import { geoResolver } from './geoResolver';
import type { RateLimitResponse } from '../../models';
import { HTTP_STATUS } from '../../utils/constants';

export class GeoLimiter {
  isBlocked(ip: string, req: Request): { blocked: boolean; reason?: string; country?: string } {
    if (!geoConfig.enabled) return { blocked: false };

    const geo = geoResolver.resolve(ip, req);

    // Check blocked countries
    if (geo.country && geoConfig.blockedCountries.includes(geo.country)) {
      return { blocked: true, reason: 'Country blocked', country: geo.country };
    }

    // Check allowed countries (if list is defined, only allow those)
    if (
      geoConfig.allowedCountries.length > 0 &&
      geo.country &&
      !geoConfig.allowedCountries.includes(geo.country)
    ) {
      return { blocked: true, reason: 'Country not in allowlist', country: geo.country };
    }

    return { blocked: false, country: geo.country };
  }

  getLimitMultiplier(country?: string): number {
    if (!country) return 1.0;
    const countryLimit = geoConfig.countryLimits[country];
    return countryLimit ? 1.0 : 1.0; // Future: per-country multipliers
  }

  getCountryConfig(country: string) {
    return geoConfig.countryLimits[country] || null;
  }
}

export const geoLimiter = new GeoLimiter();
export default GeoLimiter;
