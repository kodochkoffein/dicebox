/**
 * Structured Logger Module
 *
 * Provides JSON-structured logging with configurable levels.
 * Uses pino for high-performance logging in production.
 *
 * Environment variables:
 *   LOG_LEVEL: Set log level (trace, debug, info, warn, error, fatal). Default: info
 *   LOG_PRETTY: Set to 'true' for human-readable output in development
 */

const pino = require('pino');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_PRETTY = process.env.LOG_PRETTY === 'true';

// Create the logger with appropriate configuration
const logger = pino({
  level: LOG_LEVEL,
  // Use human-readable format in development, JSON in production
  ...(LOG_PRETTY && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Base fields included in every log entry
  base: {
    service: 'dicebox',
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: ['sessionToken', 'credential', 'secret', '*.sessionToken', '*.credential', '*.secret'],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger with additional context
 * @param {Object} bindings - Additional fields to include in all log entries
 * @returns {pino.Logger} Child logger instance
 */
function createChildLogger(bindings) {
  return logger.child(bindings);
}

/**
 * Truncate peer ID for logging (show first 8 chars)
 * @param {string} peerId - Full peer ID
 * @returns {string} Truncated peer ID
 */
function truncatePeerId(peerId) {
  if (!peerId || typeof peerId !== 'string') return 'unknown';
  return peerId.substring(0, 8) + '...';
}

module.exports = {
  logger,
  createChildLogger,
  truncatePeerId,
};
