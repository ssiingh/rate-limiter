import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceZoneService } from '@/services/geo/complianceZoneService';
import type { GeoLocation } from '../../main/models';

describe('Geo Limiter Integration', () => {
  let zoneService: ComplianceZoneService;

  beforeEach(() => {
    zoneService = new ComplianceZoneService();
  });

  describe('GDPR Zone', () => {
    it('identifies EU countries as GDPR zone', () => {
      const location: GeoLocation = {
        ip: '1.2.3.4',
        country: 'DE',
        source: 'geoip',
      };
      const zone = zoneService.resolveZone(location);
      expect(zone).not.toBeNull();
      expect(zone!.name).toBe('GDPR');
    });

    it('applies 0.8 multiplier for GDPR countries', () => {
      const location: GeoLocation = {
        ip: '1.2.3.4',
        country: 'FR',
        source: 'geoip',
      };
      const multiplier = zoneService.getLimitMultiplier(location);
      expect(multiplier).toBe(0.8);
    });

    it('does not block GDPR countries', () => {
      const location: GeoLocation = {
        ip: '1.2.3.4',
        country: 'IT',
        source: 'geoip',
      };
      expect(zoneService.isBlocked(location)).toBe(false);
    });
  });

  describe('Restricted Zone', () => {
    it('applies stricter limits for restricted countries', () => {
      const location: GeoLocation = {
        ip: '5.6.7.8',
        country: 'CN',
        source: 'geoip',
      };
      const multiplier = zoneService.getLimitMultiplier(location);
      expect(multiplier).toBe(0.5);
    });
  });

  describe('Unknown Regions', () => {
    it('returns 1.0 multiplier for unknown countries', () => {
      const location: GeoLocation = {
        ip: '9.10.11.12',
        country: 'XX',
        source: 'geoip',
      };
      const multiplier = zoneService.getLimitMultiplier(location);
      expect(multiplier).toBe(1.0);
    });

    it('returns 1.0 multiplier when country is undefined', () => {
      const location: GeoLocation = {
        ip: '9.10.11.12',
        source: 'unknown',
      };
      const multiplier = zoneService.getLimitMultiplier(location);
      expect(multiplier).toBe(1.0);
    });
  });

  describe('Zone Management', () => {
    it('adds custom zones', () => {
      zoneService.addZone({
        name: 'CUSTOM',
        countries: ['AU', 'NZ'],
        limitMultiplier: 1.5,
        blocked: false,
        description: 'Oceania zone',
      });

      const location: GeoLocation = { ip: '1.1.1.1', country: 'AU', source: 'geoip' };
      const multiplier = zoneService.getLimitMultiplier(location);
      expect(multiplier).toBe(1.5);
    });

    it('removes zones', () => {
      const removed = zoneService.removeZone('RESTRICTED');
      expect(removed).toBe(true);

      const location: GeoLocation = { ip: '1.1.1.1', country: 'CN', source: 'geoip' };
      const multiplier = zoneService.getLimitMultiplier(location);
      expect(multiplier).toBe(1.0); // No zone match after removal
    });

    it('lists all zones', () => {
      const zones = zoneService.listZones();
      expect(zones.length).toBeGreaterThanOrEqual(3);
      expect(zones.map(z => z.name)).toContain('GDPR');
    });
  });
});
