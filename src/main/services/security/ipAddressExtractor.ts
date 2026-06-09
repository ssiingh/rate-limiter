import { Request } from 'express';
import { HEADERS } from '../../utils/constants';

/**
 * Extracts the real client IP from multiple header sources with priority ordering
 */
export class IpAddressExtractor {
  extract(req: Request): string {
    // Priority: CF-Connecting-IP > X-Forwarded-For > X-Real-IP > socket.remoteAddress
    const cfIp = req.headers[HEADERS.CF_CONNECTING_IP.toLowerCase()] as string;
    if (cfIp) return cfIp.trim();

    const forwarded = req.headers[HEADERS.FORWARDED_FOR.toLowerCase()] as string;
    if (forwarded) {
      const ips = forwarded.split(',').map((ip) => ip.trim());
      const firstPublic = ips.find((ip) => !this.isPrivate(ip));
      if (firstPublic) return firstPublic;
      if (ips[0]) return ips[0];
    }

    const realIp = req.headers[HEADERS.REAL_IP.toLowerCase()] as string;
    if (realIp) return realIp.trim();

    return req.socket.remoteAddress || req.ip || '0.0.0.0';
  }

  private isPrivate(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    return privateRanges.some((range) => range.test(ip));
  }
}

export const ipExtractor = new IpAddressExtractor();
export default IpAddressExtractor;
