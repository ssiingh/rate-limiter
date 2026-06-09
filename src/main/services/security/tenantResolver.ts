import { Request } from 'express';
import { apiKeyService } from './apiKeyService';
import { HEADERS } from '../../utils/constants';

export interface TenantContext {
  tenantId: string;
  source: 'api_key' | 'header' | 'default';
}

export class TenantResolver {
  async resolve(req: Request): Promise<TenantContext> {
    // 1. Try API key
    const apiKey = req.headers[HEADERS.API_KEY.toLowerCase()] as string;
    if (apiKey) {
      const meta = await apiKeyService.validate(apiKey);
      if (meta) {
        return { tenantId: meta.tenantId, source: 'api_key' };
      }
    }

    // 2. Try tenant header
    const tenantHeader = req.headers[HEADERS.TENANT_ID.toLowerCase()] as string;
    if (tenantHeader) {
      return { tenantId: tenantHeader, source: 'header' };
    }

    // 3. Default to IP-based tenant
    return { tenantId: 'default', source: 'default' };
  }
}

export const tenantResolver = new TenantResolver();
export default TenantResolver;
