import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston Logger Configuration
 * 
 * Environment Variables:
 * - LOG_LEVEL: Set log level (error, warn, info, debug) - defaults to 'info'
 * 
 * Outputs:
 * - Console: Pretty formatted with colors and timestamps
 * - logs/error-%DATE%.log: JSON formatted error logs only
 * - logs/combined-%DATE%.log: JSON formatted logs at all levels
 */

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// If true, pretty print metadata in logs.
const prettyLogs = process.env.PRETTY_LOGS === 'true';
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp, level, message, ...meta }) => {
    let output = `[${String(timestamp)}] ${level}: ${String(message)}`;
    if (Object.keys(meta).length) {
      if (prettyLogs) {
        output += '\n' + JSON.stringify(meta, null, 2);
      } else {
        output += ' ' + JSON.stringify(meta);
      }
    }
    return output;
  }),
);

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxFiles: '14d',
      maxSize: '20m',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxFiles: '14d',
      maxSize: '20m',
    }),
  ],
});
