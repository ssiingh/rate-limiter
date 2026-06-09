import logger from '../../utils/logger';

interface IpRule {
  range: string;
  action: 'allow' | 'block';
  reason?: string;
  expiresAt?: number;
}

/**
 * IP allowlist/blocklist management for rate limiting security.
 * Supports CIDR ranges and single IP addresses.
 */
export class IpSecurityService {
  private readonly allowlist = new Map<string, IpRule>();
  private readonly blocklist = new Map<string, IpRule>();

  /**
   * Add an IP or CIDR range to the allowlist.
   */
  allow(range: string, reason?: string, expiresAt?: number): void {
    this.allowlist.set(range, { range, action: 'allow', reason, expiresAt });
    logger.info('IP allowlisted', { range, reason });
  }

  /**
   * Add an IP or CIDR range to the blocklist.
   */
  block(range: string, reason?: string, expiresAt?: number): void {
    this.blocklist.set(range, { range, action: 'block', reason, expiresAt });
    logger.warn('IP blocklisted', { range, reason });
  }

  /**
   * Check if an IP is explicitly blocked.
   */
  isBlocked(ip: string): boolean {
    this.cleanExpired(this.blocklist);
    return this.matchesAny(ip, this.blocklist);
  }

  /**
   * Check if an IP is explicitly allowed (bypasses rate limiting).
   */
  isAllowed(ip: string): boolean {
    this.cleanExpired(this.allowlist);
    return this.matchesAny(ip, this.allowlist);
  }

  /**
   * Evaluate whether an IP should be rate limited.
   * Returns 'bypass' (allowed), 'block' (blocked), or 'limit' (normal rate limiting).
   */
  evaluate(ip: string): 'bypass' | 'block' | 'limit' {
    if (this.isBlocked(ip)) return 'block';
    if (this.isAllowed(ip)) return 'bypass';
    return 'limit';
  }

  /**
   * Remove an IP from both lists.
   */
  remove(range: string): void {
    this.allowlist.delete(range);
    this.blocklist.delete(range);
  }

  /**
   * Get all rules.
   */
  getRules(): { allowlist: IpRule[]; blocklist: IpRule[] } {
    this.cleanExpired(this.allowlist);
    this.cleanExpired(this.blocklist);
    return {
      allowlist: Array.from(this.allowlist.values()),
      blocklist: Array.from(this.blocklist.values()),
    };
  }

  private matchesAny(ip: string, list: Map<string, IpRule>): boolean {
    for (const [range] of list) {
      if (this.ipMatchesRange(ip, range)) return true;
    }
    return false;
  }

  private ipMatchesRange(ip: string, range: string): boolean {
    // Exact match
    if (ip === range) return true;

    // Simple CIDR check for /24, /16, /8
    if (range.includes('/')) {
      const [network, bits] = range.split('/');
      const maskBits = parseInt(bits, 10);
      const ipParts = ip.split('.').map(Number);
      const netParts = network.split('.').map(Number);
      const fullOctets = Math.floor(maskBits / 8);

      for (let i = 0; i < fullOctets && i < 4; i++) {
        if (ipParts[i] !== netParts[i]) return false;
      }
      return true;
    }

    return false;
  }

  private cleanExpired(list: Map<string, IpRule>): void {
    const now = Date.now();
    for (const [key, rule] of list) {
      if (rule.expiresAt && now > rule.expiresAt) {
        list.delete(key);
      }
    }
  }
}

export default IpSecurityService;
