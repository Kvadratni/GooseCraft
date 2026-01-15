// Logger utility with configurable log levels

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    // Default to INFO level in production, DEBUG in development
    this.currentLevel = LogLevel.INFO;
    this.enabledCategories = new Set();
    this.disabledCategories = new Set();
  }

  /**
   * Set the global log level
   * @param {number} level - One of LogLevel enum values
   */
  setLevel(level) {
    this.currentLevel = level;
  }

  /**
   * Enable logging for specific categories
   * @param {...string} categories - Category names to enable
   */
  enableCategories(...categories) {
    categories.forEach(cat => this.enabledCategories.add(cat));
  }

  /**
   * Disable logging for specific categories
   * @param {...string} categories - Category names to disable
   */
  disableCategories(...categories) {
    categories.forEach(cat => this.disabledCategories.add(cat));
  }

  /**
   * Check if a message should be logged
   */
  shouldLog(level, category) {
    if (level < this.currentLevel) return false;

    if (this.disabledCategories.has(category)) return false;

    if (this.enabledCategories.size > 0 && !this.enabledCategories.has(category)) {
      return false;
    }

    return true;
  }

  /**
   * Format log message with category prefix
   */
  formatMessage(category, message) {
    return category ? `[${category}] ${message}` : message;
  }

  /**
   * Log debug message
   */
  debug(category, message, ...args) {
    if (this.shouldLog(LogLevel.DEBUG, category)) {
      console.log(this.formatMessage(category, message), ...args);
    }
  }

  /**
   * Log info message
   */
  info(category, message, ...args) {
    if (this.shouldLog(LogLevel.INFO, category)) {
      console.log(this.formatMessage(category, message), ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(category, message, ...args) {
    if (this.shouldLog(LogLevel.WARN, category)) {
      console.warn(this.formatMessage(category, message), ...args);
    }
  }

  /**
   * Log error message
   */
  error(category, message, ...args) {
    if (this.shouldLog(LogLevel.ERROR, category)) {
      console.error(this.formatMessage(category, message), ...args);
    }
  }

  /**
   * Create a scoped logger for a specific category
   */
  scope(category) {
    return {
      debug: (message, ...args) => this.debug(category, message, ...args),
      info: (message, ...args) => this.info(category, message, ...args),
      warn: (message, ...args) => this.warn(category, message, ...args),
      error: (message, ...args) => this.error(category, message, ...args)
    };
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the logger instance and LogLevel enum
export { logger, LogLevel };
export default logger;
