import * as fs from 'fs';
import * as path from 'path';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
};

/**
 * ANSI color codes for console output
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  logFile?: string;
  consoleEnabled: boolean;
  fileEnabled: boolean;
  colorsEnabled: boolean;
}

/**
 * Logger class for structured logging with multiple outputs
 */
export class Logger {
  private config: LoggerConfig;
  private logStream?: fs.WriteStream;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level || LogLevel.INFO,
      logFile: config.logFile,
      consoleEnabled: config.consoleEnabled !== false,
      fileEnabled: config.fileEnabled !== false,
      colorsEnabled: config.colorsEnabled !== false,
    };

    // Initialize file logging if enabled
    if (this.config.fileEnabled && this.config.logFile) {
      this.initializeFileLogging();
    }
  }

  /**
   * Initialize file logging stream
   */
  private initializeFileLogging(): void {
    if (!this.config.logFile) return;

    try {
      // Create logs directory if it doesn't exist
      const logDir = path.dirname(this.config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Create write stream with append mode
      this.logStream = fs.createWriteStream(this.config.logFile, {
        flags: 'a',
        encoding: 'utf8',
      });

      this.logStream.on('error', (error) => {
        console.error('Failed to write to log file:', error);
      });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Check if a log level should be logged based on current configuration
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /**
   * Format log message with timestamp and metadata
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] ${contextStr} ${message}${metadataStr}`;
  }

  /**
   * Get color for log level
   */
  private getColor(level: LogLevel): string {
    if (!this.config.colorsEnabled) return '';

    switch (level) {
      case LogLevel.ERROR:
        return COLORS.red;
      case LogLevel.WARN:
        return COLORS.yellow;
      case LogLevel.INFO:
        return COLORS.blue;
      case LogLevel.DEBUG:
        return COLORS.gray;
      default:
        return COLORS.reset;
    }
  }

  /**
   * Write log to console
   */
  private writeToConsole(level: LogLevel, formattedMessage: string): void {
    if (!this.config.consoleEnabled) return;

    const color = this.getColor(level);
    const coloredMessage = color
      ? `${color}${formattedMessage}${COLORS.reset}`
      : formattedMessage;

    if (level === LogLevel.ERROR) {
      console.error(coloredMessage);
    } else if (level === LogLevel.WARN) {
      console.warn(coloredMessage);
    } else {
      console.log(coloredMessage);
    }
  }

  /**
   * Write log to file
   */
  private writeToFile(formattedMessage: string): void {
    if (!this.config.fileEnabled || !this.logStream) return;

    this.logStream.write(formattedMessage + '\n');
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context, metadata);

    this.writeToConsole(level, formattedMessage);
    this.writeToFile(formattedMessage);
  }

  /**
   * Log error message
   */
  error(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(error: Error, context?: string): void {
    this.error(error.message, context, {
      stack: error.stack,
      name: error.name,
    });
  }

  /**
   * Close log stream
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

/**
 * Default logger instance
 */
let defaultLogger: Logger | null = null;

/**
 * Initialize default logger with configuration
 */
export function initializeLogger(config: Partial<LoggerConfig>): Logger {
  defaultLogger = new Logger(config);
  return defaultLogger;
}

/**
 * Get default logger instance
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger();
  }
  return defaultLogger;
}

/**
 * Convenience functions using default logger
 */
export const logger = {
  error: (message: string, context?: string, metadata?: Record<string, unknown>) =>
    getLogger().error(message, context, metadata),
  warn: (message: string, context?: string, metadata?: Record<string, unknown>) =>
    getLogger().warn(message, context, metadata),
  info: (message: string, context?: string, metadata?: Record<string, unknown>) =>
    getLogger().info(message, context, metadata),
  debug: (message: string, context?: string, metadata?: Record<string, unknown>) =>
    getLogger().debug(message, context, metadata),
  errorWithStack: (error: Error, context?: string) =>
    getLogger().errorWithStack(error, context),
};

// Made with Bob
