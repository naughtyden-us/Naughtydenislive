// Centralized logging utility

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  source?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, data?: any, source?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatMessage(level, message, data, source);
    
    // Console logging
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[DEBUG] ${message}`, data);
        break;
      case LogLevel.INFO:
        console.info(`[INFO] ${message}`, data);
        break;
      case LogLevel.WARN:
        console.warn(`[WARN] ${message}`, data);
        break;
      case LogLevel.ERROR:
        console.error(`[ERROR] ${message}`, data);
        break;
    }

    // Send to external logging service in production
    if (!this.isDevelopment && level >= LogLevel.WARN) {
      this.sendToExternalService(logEntry);
    }
  }

  private async sendToExternalService(logEntry: LogEntry): Promise<void> {
    try {
      // In production, send to your logging service
      // Examples: Sentry, LogRocket, DataDog, etc.
      
      // Example implementation for a custom logging endpoint
      if (process.env.NEXT_PUBLIC_LOGGING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry),
        });
      }
    } catch (error) {
      // Fallback to console if external service fails
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  error(message: string, error?: Error | any, source?: string): void {
    const errorData = error instanceof Error 
      ? { 
          message: error.message, 
          stack: error.stack, 
          name: error.name 
        }
      : error;
    
    this.log(LogLevel.ERROR, message, errorData, source);
  }

  // Performance logging
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Database operation logging
  dbOperation(operation: string, collection: string, data?: any): void {
    this.debug(`DB ${operation} on ${collection}`, data, 'DatabaseService');
  }

  // API request logging
  apiRequest(method: string, url: string, data?: any): void {
    this.info(`API ${method} ${url}`, data, 'ApiService');
  }

  apiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `API ${method} ${url} - ${status}`, data, 'ApiService');
  }

  // User action logging
  userAction(action: string, userId?: string, data?: any): void {
    this.info(`User action: ${action}`, { userId, ...data }, 'UserAction');
  }

  // Authentication logging
  authEvent(event: string, userId?: string, data?: any): void {
    this.info(`Auth event: ${event}`, { userId, ...data }, 'AuthService');
  }

  // Error boundary logging
  errorBoundary(error: Error, errorInfo: any, componentStack?: string): void {
    this.error('Error caught by boundary', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo,
      componentStack,
    }, 'ErrorBoundary');
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions
export const logDebug = (message: string, data?: any, source?: string) => 
  logger.debug(message, data, source);

export const logInfo = (message: string, data?: any, source?: string) => 
  logger.info(message, data, source);

export const logWarn = (message: string, data?: any, source?: string) => 
  logger.warn(message, data, source);

export const logError = (message: string, error?: Error | any, source?: string) => 
  logger.error(message, error, source);

// Performance measurement helper
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();
  logger.time(operationName);
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    logger.timeEnd(operationName);
    logger.info(`Performance: ${operationName} completed in ${duration.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    logger.timeEnd(operationName);
    logger.error(`Performance: ${operationName} failed`, error);
    throw error;
  }
};

// Database operation wrapper with logging
export const withDbLogging = <T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  collection: string
) => {
  return async (...args: T): Promise<R> => {
    logger.dbOperation(operationName, collection, args);
    
    try {
      const result = await operation(...args);
      logger.dbOperation(`${operationName} success`, collection, { result });
      return result;
    } catch (error) {
      logger.error(`DB ${operationName} failed on ${collection}`, error);
      throw error;
    }
  };
};
