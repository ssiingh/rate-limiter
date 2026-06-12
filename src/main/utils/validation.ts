import { z } from 'zod';

/**
 * Zod schemas for request validation across all API endpoints.
 */

export const RateLimitCheckSchema = z.object({
  key: z.string().min(1).max(512),
  algorithm: z
    .enum(['token_bucket', 'sliding_window', 'fixed_window', 'leaky_bucket', 'composite'])
    .optional(),
  limit: z.number().int().positive().max(1_000_000).optional(),
  windowMs: z.number().int().positive().max(86_400_000).optional(), // max 24h
  cost: z.number().int().positive().max(1000).optional().default(1),
  burstSize: z.number().int().positive().optional(),
  refillRate: z.number().positive().optional(),
  endpoint: z.string().max(256).optional(),
  tenantId: z.string().max(128).optional(),
  userId: z.string().max(128).optional(),
  ip: z.string().max(45).optional(), // IPv6 max length
  metadata: z.record(z.unknown()).optional(),
});

// Alias for backward compatibility
export const RateLimitRequestSchema = RateLimitCheckSchema;

export const AdminLimitSchema = z.object({
  key: z.string().min(1).max(512),
  limit: z.number().int().positive().max(1_000_000),
  windowMs: z.number().int().positive().max(86_400_000),
  algorithm: z
    .enum(['token_bucket', 'sliding_window', 'fixed_window', 'leaky_bucket', 'composite'])
    .optional(),
  expiresAt: z.number().int().positive().optional(),
});

export const BenchmarkRequestSchema = z.object({
  scenario: z.enum(['burst', 'sustained', 'mixed', 'stress', 'spike']),
  concurrency: z.number().int().positive().max(500),
  durationMs: z.number().int().positive().max(300_000), // max 5 min
  targetRps: z.number().int().positive().optional(),
  algorithm: z
    .enum(['token_bucket', 'sliding_window', 'fixed_window', 'leaky_bucket', 'composite'])
    .optional(),
});

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Validate a request body against a schema.
 * Throws on validation failure, returns the validated data on success.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
