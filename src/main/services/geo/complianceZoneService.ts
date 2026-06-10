import type { ComplianceZone, GeoLocation } from '../../models';
import logger from '../../utils/logger';

/**
 * GDPR/CCPA compliance zone management.
 * Maps countries to zones and applies limit multipliers.
 */
export class ComplianceZoneService {
  private readonly zones: Map<string, ComplianceZone> = new Map();
  private readonly countryToZone: Map<string, string> = new Map();

  constructor() {
    this.loadDefaultZones();
  }

  /**
   * Load default compliance zones (GDPR, CCPA, etc.).
   */
  private loadDefaultZones(): void {
    const defaults: ComplianceZone[] = [
      {
        name: 'GDPR',
        countries: [
          'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
          'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
          'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'NO', 'IS', 'LI',
        ],
        limitMultiplier: 0.8, // More conservative limits for GDPR regions
        blocked: false,
        description: 'European Union GDPR compliance zone',
      },
      {
        name: 'CCPA',
        countries: ['US'],
        regions: ['CA'],
        limitMultiplier: 0.9,
        blocked: false,
        description: 'California Consumer Privacy Act zone',
      },
      {
        name: 'RESTRICTED',
        countries: ['CN', 'RU', 'KP', 'IR'],
        limitMultiplier: 0.5,
        blocked: false,
        description: 'Restricted regions with stricter rate limits',
      },
      {
        name: 'BLOCKED',
        countries: [],
        limitMultiplier: 0,
        blocked: true,
        description: 'Blocked regions — no traffic allowed',
      },
    ];

    for (const zone of defaults) {
      this.addZone(zone);
    }
  }

  /**
   * Add or update a compliance zone.
   */
  addZone(zone: ComplianceZone): void {
    this.zones.set(zone.name, zone);
    for (const country of zone.countries) {
      this.countryToZone.set(country.toUpperCase(), zone.name);
    }
    logger.info('Compliance zone registered', { name: zone.name, countries: zone.countries.length });
  }

  /**
   * Remove a compliance zone.
   */
  removeZone(name: string): boolean {
    const zone = this.zones.get(name);
    if (!zone) return false;

    for (const country of zone.countries) {
      this.countryToZone.delete(country.toUpperCase());
    }
    this.zones.delete(name);
    return true;
  }

  /**
   * Resolve the compliance zone for a geo location.
   */
  resolveZone(location: GeoLocation): ComplianceZone | null {
    if (!location.country) return null;

    const zoneName = this.countryToZone.get(location.country.toUpperCase());
    return zoneName ? this.zones.get(zoneName) || null : null;
  }

  /**
   * Get the rate limit multiplier for a geo location.
   * Returns 1.0 if no zone matches (default: no adjustment).
   */
  getLimitMultiplier(location: GeoLocation): number {
    const zone = this.resolveZone(location);
    return zone?.limitMultiplier ?? 1.0;
  }

  /**
   * Check if traffic from a location should be blocked.
   */
  isBlocked(location: GeoLocation): boolean {
    const zone = this.resolveZone(location);
    return zone?.blocked ?? false;
  }

  /**
   * Get all registered zones.
   */
  listZones(): ComplianceZone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Get a specific zone by name.
   */
  getZone(name: string): ComplianceZone | null {
    return this.zones.get(name) || null;
  }
}

export default ComplianceZoneService;
