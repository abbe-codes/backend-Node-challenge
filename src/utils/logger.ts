import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Define custom format for console logging
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Define custom format for file logging (JSON)
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }), // Log stack trace if error
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // Default to 'info'
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    // Console transport with colorization and simple format
    new winston.transports.Console({
      format: combine(colorize(), errors({ stack: true }), consoleFormat),
    }),
    // File transport for all logs (JSON format)
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
    }),
    // File transport for error logs only (JSON format)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    }),
  ],
  exceptionHandlers: [
    // Handle uncaught exceptions
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    // Handle unhandled promise rejections
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: fileFormat,
    }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

export default logger;
