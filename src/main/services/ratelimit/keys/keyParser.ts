/**
 * Parses structured rate-limit Redis keys back into their component parts.
 *
 * Key format: `rl:{algorithm}:{identifier}`
 * Example:    `rl:token_bucket:user:12345`  →  { prefix: 'rl', algorithm: 'token_bucket', identifier: 'user:12345' }
 */
export interface ParsedKey {
  prefix: string;
  algorithm: string;
  identifier: string;
  raw: string;
}

export class KeyParser {
  private static readonly PREFIX = 'rl';

  /**
   * Parse a Redis rate-limit key into its component parts.
   * Returns null if the key does not match the expected format.
   */
  static parse(key: string): ParsedKey | null {
    const parts = key.split(':');
    if (parts.length < 3 || parts[0] !== KeyParser.PREFIX) {
      return null;
    }

    return {
      prefix: parts[0],
      algorithm: parts[1],
      identifier: parts.slice(2).join(':'),
      raw: key,
    };
  }

  /**
   * Extract just the algorithm name from a key.
   */
  static extractAlgorithm(key: string): string | null {
    const parsed = this.parse(key);
    return parsed?.algorithm ?? null;
  }

  /**
   * Extract just the identifier from a key.
   */
  static extractIdentifier(key: string): string | null {
    const parsed = this.parse(key);
    return parsed?.identifier ?? null;
  }

  /**
   * Validate that a key matches the expected rate-limit key format.
   */
  static isValid(key: string): boolean {
    return this.parse(key) !== null;
  }
}

export default KeyParser;
