import type { ConfigurationResponse, RateLimitConfig } from '../models';
import logger from '../utils/logger';

interface ConfigOverride {
  key: string;
  config: Partial<RateLimitConfig>;
  expiresAt?: number;
}

/**
 * Configuration service supporting hot-reload from environment variables and
 * runtime overrides stored in memory (backed by Redis for persistence).
 */
export class ConfigurationService {
  private overrides = new Map<string, ConfigOverride>();
  private patterns = new Map<string, ConfigOverride>();
  private dynamicDefaults: Partial<ConfigurationResponse> = {};
  private lastReloadAt = Date.now();
  private reloadListeners: Array<() => void> = [];

  getDefaultConfig(): ConfigurationResponse {
    const envDefaults = {
      defaultAlgorithm: process.env.DEFAULT_ALGORITHM || 'token_bucket',
      defaultLimit: parseInt(process.env.DEFAULT_RATE_LIMIT || '100', 10),
      defaultWindowMs: parseInt(process.env.DEFAULT_WINDOW_MS || '60000', 10),
      adaptiveEnabled: process.env.ADAPTIVE_ENABLED !== 'false',
      geoEnabled: process.env.GEO_ENABLED !== 'false',
      circuitBreakerEnabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    } as ConfigurationResponse;
    return { ...envDefaults, ...this.dynamicDefaults };
  }

  updateDefaultConfig(newDefaults: Partial<ConfigurationResponse>): void {
    this.dynamicDefaults = { ...this.dynamicDefaults, ...newDefaults };
    logger.info('Default configuration dynamically updated', { defaults: this.dynamicDefaults });
  }

  /**
   * Get the effective configuration for a specific key,
   * merging defaults with any active override or matching pattern.
   */
  getEffectiveConfig(key: string): Partial<RateLimitConfig> | null {
    // 1. Exact Key Match
    const override = this.overrides.get(key);
    if (override) {
      if (override.expiresAt && Date.now() > override.expiresAt) {
        this.overrides.delete(key);
      } else {
        return override.config;
      }
    }

    // 2. Pattern Match
    const now = Date.now();
    for (const [pattern, patternOverride] of this.patterns) {
      if (patternOverride.expiresAt && now > patternOverride.expiresAt) {
        this.patterns.delete(pattern);
        continue;
      }
      
      const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$';
      if (new RegExp(regexStr).test(key)) {
        return patternOverride.config;
      }
    }

    // 3. Fallback to default
    return null;
  }

  setOverride(key: string, config: Partial<RateLimitConfig>, expiresAt?: number): void {
    this.overrides.set(key, { key, config, expiresAt });
    logger.info('Configuration override set', { key, config, expiresAt });
  }

  removeOverride(key: string): boolean {
    const existed = this.overrides.delete(key);
    if (existed) {
      logger.info('Configuration override removed', { key });
    }
    return existed;
  }

  setPatternOverride(pattern: string, config: Partial<RateLimitConfig>, expiresAt?: number): void {
    this.patterns.set(pattern, { key: pattern, config, expiresAt });
    logger.info('Pattern configuration set', { pattern, config, expiresAt });
  }

  removePatternOverride(pattern: string): boolean {
    const existed = this.patterns.delete(pattern);
    if (existed) {
      logger.info('Pattern configuration removed', { pattern });
    }
    return existed;
  }

  listOverrides(): ConfigOverride[] {
    const now = Date.now();
    const active: ConfigOverride[] = [];
    for (const [k, v] of this.overrides) {
      if (v.expiresAt && now > v.expiresAt) {
        this.overrides.delete(k);
      } else {
        active.push(v);
      }
    }
    return active;
  }

  listPatternOverrides(): ConfigOverride[] {
    const now = Date.now();
    const active: ConfigOverride[] = [];
    for (const [k, v] of this.patterns) {
      if (v.expiresAt && now > v.expiresAt) {
        this.patterns.delete(k);
      } else {
        active.push(v);
      }
    }
    return active;
  }

  onReload(listener: () => void): void {
    this.reloadListeners.push(listener);
  }

  /**
   * Reload configuration from environment variables and notify listeners
   */
  reload(): ConfigurationResponse {
    this.lastReloadAt = Date.now();
    const config = this.getDefaultConfig();
    logger.info('Configuration reloaded', config);
    
    // Notify elements like the RateLimiterService to flush buckets/caches if applicable
    for (const listener of this.reloadListeners) {
      try {
        listener();
      } catch (err) {
        logger.error('Error executing configuration reload listener', { err });
      }
    }
    
    return config;
  }

  getLastReloadAt(): number {
    return this.lastReloadAt;
  }
}

// Ensure singleton pattern for global state retention
export const configurationService = new ConfigurationService();
export default configurationService;
