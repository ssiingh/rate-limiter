import dotenv from 'dotenv';
dotenv.config();

export interface AdminAuthConfig {
  apiKey: string;
  jwtSecret: string;
  allowedIPs: string[];
}

const adminAuthConfig: AdminAuthConfig = {
  apiKey: process.env.ADMIN_API_KEY || 'change-me-admin-key',
  jwtSecret: process.env.ADMIN_JWT_SECRET || 'change-me-jwt-secret',
  allowedIPs: (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1').split(',').map((ip) => ip.trim()),
};

export default adminAuthConfig;
