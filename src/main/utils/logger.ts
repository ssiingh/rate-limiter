import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, correlationId, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level.toUpperCase()}]${correlationId ? ` [${correlationId}]` : ''} ${message} ${metaStr}`;
});

const createLogger = () => {
  const level = process.env.LOG_LEVEL || 'info';
  const isDevelopment = process.env.NODE_ENV === 'development';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
  ];

  if (!isDevelopment) {
    transports.push(
      new DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(timestamp(), errors({ stack: true }), winston.format.json()),
      }),
      new DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: combine(timestamp(), errors({ stack: true }), winston.format.json()),
      })
    );
  }

  return winston.createLogger({
    level,
    transports,
    exitOnError: false,
  });
};

const logger = createLogger();

export const createChildLogger = (context: Record<string, unknown>) =>
  logger.child(context);

export default logger;
