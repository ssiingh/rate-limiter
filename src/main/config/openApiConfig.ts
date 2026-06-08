import { SwaggerDefinition } from 'swagger-jsdoc';

export const openApiDefinition: SwaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Distributed Rate Limiter API',
    version: '1.0.0',
    description:
      'Production-ready distributed rate limiter with 5 algorithms, adaptive ML rate limiting, and geo awareness.',
    contact: {
      name: 'Rate Limiter Team',
      email: 'team@rate-limiter.io',
    },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.rate-limiter.io', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
      AdminAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Admin-Key',
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

export const swaggerOptions = {
  swaggerDefinition: openApiDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
