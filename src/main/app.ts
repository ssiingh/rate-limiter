import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import morgan from 'morgan';

import { requestContextMiddleware } from './middlewares/requestContextMiddleware';
import { geoLimiterMiddleware } from './middlewares/geoLimiterMiddleware';
import { errorHandler } from './middlewares/errorHandler';

import rateLimitRoutes from './routes/rateLimitRoutes';
import healthRoutes from './routes/healthRoutes';
import metricsRoutes from './routes/metricsRoutes';
import adminRoutes from './routes/adminRoutes';
import benchmarkRoutes from './routes/benchmarkRoutes';
import configRoutes from './routes/configRoutes';
import performanceRoutes from './routes/performanceRoutes';

import { swaggerOptions } from './config/openApiConfig';
import logger from './utils/logger';

const app = express();
app.set('trust proxy', 1); // Trust Render proxy

// Security & compression
app.use(helmet());

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000', // Add the specific Render frontend
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const envOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [];
    
    const allAllowed = [...ALLOWED_ORIGINS, ...envOrigins];
    
    // Allow if no origin (e.g. server-to-server) or in allowed list or matching onrender.com
    if (!origin || allAllowed.includes(origin) || origin.endsWith('onrender.com')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-admin-key'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// Request context (correlationId, tenant, IP)
app.use(requestContextMiddleware);

// Geo limiting
app.use(geoLimiterMiddleware);

// OpenAPI docs
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

import adaptiveRoutes from './routes/adaptiveRoutes';

// Routes - New API Reference mapping
app.use('/api/ratelimit/config', configRoutes);
app.use('/api/ratelimit/adaptive', adaptiveRoutes);
app.use('/api/ratelimit', rateLimitRoutes);
app.use('/api/benchmark', benchmarkRoutes);
app.use('/api/performance', performanceRoutes);

// Admin & Metrics
app.use('/admin', adminRoutes);
app.use('/metrics', metricsRoutes);

// Health & Actuator
app.use('/health', healthRoutes);
app.use('/actuator/health', healthRoutes);
app.use('/actuator/metrics', metricsRoutes);
app.use('/actuator/prometheus', metricsRoutes);

// Backward compatibility aliases for existing dashboard
app.use('/rate-limit/adaptive', adaptiveRoutes);
app.use('/rate-limit', rateLimitRoutes);
app.use('/benchmark', benchmarkRoutes);

// Root redirect to docs
app.get('/', (req, res) => res.redirect('/api-docs'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
