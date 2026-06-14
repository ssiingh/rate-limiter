import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurationService } from '../../main/services/configurationService';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    service = new ConfigurationService();
  });

  describe('Hierarchy Resolution', () => {
    it('returns null when no overrides exist', () => {
      expect(service.getEffectiveConfig('api:user:123')).toBeNull();
    });

    it('returns exact key match over pattern match', () => {
      service.setPatternOverride('api:user:*', { limit: 50 });
      service.setOverride('api:user:123', { limit: 100 });

      const config = service.getEffectiveConfig('api:user:123');
      expect(config?.limit).toBe(100);
      
      const patternConfig = service.getEffectiveConfig('api:user:456');
      expect(patternConfig?.limit).toBe(50);
    });

    it('properly resolves wildcard patterns in the middle', () => {
      service.setPatternOverride('api:*:status', { limit: 200, algorithm: 'sliding_window' });
      
      const config1 = service.getEffectiveConfig('api:system:status');
      const config2 = service.getEffectiveConfig('api:billing:status');
      const noMatch = service.getEffectiveConfig('api:system:health');

      expect(config1?.limit).toBe(200);
      expect(config1?.algorithm).toBe('sliding_window');
      expect(config2?.limit).toBe(200);
      expect(noMatch).toBeNull();
    });

    it('respects expiration times on keys and patterns', () => {
      const past = Date.now() - 10000;
      service.setOverride('expired:key', { limit: 10 }, past);
      service.setPatternOverride('expired:*', { limit: 20 }, past);

      expect(service.getEffectiveConfig('expired:key')).toBeNull();
      expect(service.getEffectiveConfig('expired:test')).toBeNull();
    });
  });

  describe('Dynamic Defaults', () => {
    it('updates defaults seamlessly', () => {
      // Verify base defaults first
      expect(service.getDefaultConfig().defaultLimit).toBe(100);
      
      // Update default capacity dynamically
      service.updateDefaultConfig({ defaultLimit: 500 });
      expect(service.getDefaultConfig().defaultLimit).toBe(500);
    });
  });
});
