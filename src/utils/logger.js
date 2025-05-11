const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure log directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Parse DEBUG_MODE with better fallback
let isDebugEnabled = process.env.DEBUG_MODE === 'true';

// Track if logging is enabled (separate from debug mode)
let isLoggingEnabled = process.env.LOGGING_ENABLED !== 'false';

// Custom log levels with colors
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
    owner: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'grey',
    owner: 'magenta'
  }
};

// File log format (without colors)
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}`;
});

// Console log format (with colors)
const consoleFormat = printf(({ level, message }) => {
  return `[${level.toUpperCase().padEnd(5)}] ${message}`;
});

/**
 * Adds color to a text string for console output
 * @param {string} text - Text to colorize
 * @param {string} colorCode - ANSI color code to use
 * @returns {string} Colorized text
 */
const colorText = (text, colorCode) => {
  const colors = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    reset: '\x1b[0m'
  };
  
  return `${colors[colorCode] || colors.white}${text}${colors.reset}`;
};

// Custom colors untuk banner startup
const startupFormat = winston.format.printf(({ level, message, timestamp }) => {
  // Determine color based on message content
  let colorCode = 'green';
  
  if (message.includes('Error') || message.includes('error')) {
    colorCode = 'red';
  } else if (message.includes('Warning') || message.includes('warning')) {
    colorCode = 'yellow';
  } else if (message.includes('INFO') || message.includes('DEVELOPER')) {
    colorCode = 'brightCyan';
  } else if (message.includes('===')) {
    colorCode = 'magenta';
  } else if (message.includes('ONLINE') || message.includes('READY')) {
    colorCode = 'brightGreen';
  } else if (message.includes('INITIALIZING')) {
    colorCode = 'brightYellow';
  } else if (message.includes('ASCII Art:')) {
    // Don't colorize ASCII art, just return it as is
    return message.replace('ASCII Art: ', '');
  }
  
  return colorText(message, colorCode);
});

// Function to update .env file
const updateEnvFile = (key, value) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const regex = new RegExp(`^${key}=.*`, 'm');

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `${envContent ? '\n' : ''}${key}=${value}`;
    }

    fs.writeFileSync(envPath, envContent.trim());
    return true;
  } catch (error) {
    console.error('Failed to update .env file:', error);
    return false;
  }
};

// Format log kustom yang lebih informatif
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    // Tambahkan stack trace jika ada
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Tambahkan metadata jika ada
    if (Object.keys(meta).length > 0) {
      try {
        const metaStr = JSON.stringify(meta, null, 2);
      } catch (err) {
        logMessage += `\nMetadata: [Unstringifiable Object]`;
      }
    }
    
    return logMessage;
  })
);

// Logger utama bot dengan fitur rotasi dan pembatasan ukuran file
const botLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'whatsapp-bot' },
  transports: [
    // Log debug dan semua level di atasnya ke console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
      level: 'debug'
    }),
    
    // Log errors ke file terpisah
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Semua log ke file combined
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20 MB
      maxFiles: 10,
      tailable: true
    })
  ],
  // Tidak exit pada uncaught exceptions
  exitOnError: false
});

// Tambahkan handler untuk uncaught exceptions
process.on('uncaughtException', (error) => {
  botLogger.error(`Uncaught exception: ${error.message}`, { 
    stack: error.stack,
    errorObject: error
  });
});

// Tambahkan handler untuk unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
  botLogger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`, {
    reason: reason instanceof Error ? reason.stack : reason
  });
});

// Helper function untuk membuat child logger dengan context
botLogger.createContextLogger = function(context) {
  return botLogger.child({ context });
};

// Recovery logger untuk mencatat informasi pemulihan sistem
botLogger.logRecovery = function(message, context = {}) {
  botLogger.info(`[RECOVERY] ${message}`, { ...context, recoveryEvent: true });
};

// Fungsi untuk mencatat metric
botLogger.logMetric = function(metricName, value, tags = {}) {
  botLogger.info(`[METRIC] ${metricName}: ${value}`, { 
    metric: metricName,
    value,
    tags,
    isMetric: true
  });
};

// Fungsi untuk mencatat ratelimit event
botLogger.logRateLimit = function(source, details = {}) {
  botLogger.warn(`[RATE_LIMIT] Rate limit reached for ${source}`, {
    source,
    ...details,
    isRateLimit: true
  });
};

// Fungsi sanitasi untuk menghapus informasi sensitif sebelum log
botLogger.sanitizeAndLog = function(level, message, data = {}) {
  // Daftar kata kunci sensitif yang perlu disensor
  const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'auth', 'credentials'];
  
  // Fungsi rekursif untuk sanitasi objek
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    for (const key in sanitized) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitize(sanitized[key]);
      }
    }
    return sanitized;
  };
  
  // Log dengan data yang sudah disanitasi
  botLogger.log(level, message, sanitize(data));
};

// Create Baileys logger instance
const baileysLogger = winston.createLogger({
  levels: logLevels.levels,
  level: isDebugEnabled ? 'debug' : 'error',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        consoleFormat
      ),
      silent: !isLoggingEnabled
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'baileys-error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'baileys.log'),
      silent: !isLoggingEnabled && true
    })
  ]
});

// Apply colors to log levels
winston.addColors(logLevels.colors);

/**
 * Toggle debug mode on or off
 * @param {boolean|string} enable - Set to true/false or 'true'/'false' to enable/disable debug
 * @returns {boolean} Current debug status after change
 */
const toggleDebug = (enable) => {
  // Convert input to boolean with stricter logic
  const newStatus = typeof enable === 'boolean' ? enable : String(enable).toLowerCase() === 'true';
  
  // Only proceed if there's a change
  if (isDebugEnabled !== newStatus) {
    isDebugEnabled = newStatus;
    
    // Update log levels
    botLogger.level = isDebugEnabled ? 'debug' : 'info';
    baileysLogger.level = isDebugEnabled ? 'debug' : 'error';
    
    // Update transports
    botLogger.transports.forEach(t => {
      if (t instanceof winston.transports.Console) {
        t.level = isDebugEnabled ? 'debug' : 'info';
      }
    });
    
    baileysLogger.transports.forEach(t => {
      if (t instanceof winston.transports.Console) {
        t.level = isDebugEnabled ? 'debug' : 'error';
      }
    });
    
    // Persist setting to .env file
    updateEnvFile('DEBUG_MODE', isDebugEnabled ? 'true' : 'false');
    
    // Log the status change
    botLogger.info(`Debug mode ${isDebugEnabled ? 'enabled' : 'disabled'}`);
  }
  
  return isDebugEnabled;
};

/**
 * Toggle logging on or off
 * @param {boolean|string} enable - Set to true/false or 'true'/'false' to enable/disable logging
 * @returns {boolean} Current logging status after change
 */
const toggleLogging = (enable) => {
  // Convert input to boolean with stricter logic
  const newStatus = typeof enable === 'boolean' ? enable : String(enable).toLowerCase() === 'true';
  
  // Only proceed if there's a change
  if (isLoggingEnabled !== newStatus) {
    isLoggingEnabled = newStatus;
    
    // Update transports - error logs still work even when disabled
    botLogger.transports.forEach(t => {
      if (t instanceof winston.transports.Console) {
        t.silent = !isLoggingEnabled;
      }
      if (t instanceof winston.transports.File && t.filename !== path.join(logDir, 'error.log')) {
        t.silent = !isLoggingEnabled;
      }
    });
    
    baileysLogger.transports.forEach(t => {
      if (t instanceof winston.transports.Console) {
        t.silent = !isLoggingEnabled;
      }
      if (t instanceof winston.transports.File && t.filename !== path.join(logDir, 'baileys-error.log')) {
        t.silent = !isLoggingEnabled;
      }
    });
    
    // Persist setting to .env file
    updateEnvFile('LOGGING_ENABLED', isLoggingEnabled ? 'true' : 'false');
    
    // Log the status change to error log (will be visible even if logging is disabled)
    if (isLoggingEnabled) {
      botLogger.info(`Logging has been enabled`);
    } else {
      botLogger.error(`Logging has been disabled. Only errors will be logged.`);
    }
  }
  
  return isLoggingEnabled;
};

/**
 * Get current logging status
 * @returns {boolean} Current logging status
 */
const getLoggingStatus = () => isLoggingEnabled;

/**
 * Log a message with specified level
 * @param {string} message - Message to log
 * @param {string} type - Log level (error, warn, info, debug, trace, owner, success)
 */
const log = (message, type = 'info') => {
  const normalizedType = type.toLowerCase();

  // Error logs are always processed, regardless of logging status
  if (normalizedType === 'error') {
    botLogger.error(message);
    return;
  }

  // Skip all non-error logs if logging is disabled
  if (!isLoggingEnabled && normalizedType !== 'error') {
    return;
  }

  // Owner logs are always shown if logging is enabled
  if (normalizedType === 'owner') {
    botLogger.log('owner', `[OWNER] ${message}`);
    return;
  }

  // Skip debug and trace logs if debug is disabled (but logging is enabled)
  if (!isDebugEnabled && (normalizedType === 'debug' || normalizedType === 'trace')) {
    return;
  }

  switch (normalizedType) {
    case 'warn':
    case 'warning':
    botLogger.warn(message);
      break;
    case 'debug':
      botLogger.debug(message);
      break;
    case 'trace':
      botLogger.debug(`[TRACE] ${message}`);
      break;
    case 'success':
      botLogger.info(`[SUCCESS] ${message}`);
      break;
    default:
      botLogger.info(message);
  }
};

/**
 * Get current debug status
 * @returns {boolean} Current debug status
 */
const getDebugStatus = () => isDebugEnabled;

/**
 * Manually set the log level for both loggers
 * @param {string} level - Log level to set
 */
const setLogLevel = (level) => {
  if (logLevels.levels[level] !== undefined) {
    botLogger.level = level;
    baileysLogger.level = level;
    
    botLogger.transports.forEach(t => {
      if (t instanceof winston.transports.Console) {
        t.level = level;
      }
    });
    
    baileysLogger.transports.forEach(t => {
      if (t instanceof winston.transports.Console) {
        t.level = level;
      }
    });
    
    return true;
  }
  return false;
};

/**
 * Log message that will always be displayed regardless of logging status
 * Used for essential bot information like startup banner and credits
 * @param {string} message - Message to log
 * @param {string} type - Log level (defaults to 'info')
 */
const logAlways = (message, type = 'info') => {
  const normalizedType = type.toLowerCase();
  
  // Always log to console regardless of logging status
  const originalSilentState = {};
  
  // Temporarily enable console transport
  botLogger.transports.forEach(t => {
    if (t instanceof winston.transports.Console) {
      originalSilentState.console = t.silent;
      t.silent = false;
    }
  });
  
  // Log the message based on type
  switch (normalizedType) {
    case 'error':
      botLogger.error(message);
      break;
    case 'warn':
    case 'warning':
      botLogger.warn(message);
      break;
    case 'debug':
      botLogger.debug(message);
      break;
    case 'trace':
      botLogger.debug(`[TRACE] ${message}`);
      break;
    case 'owner':
      botLogger.log('owner', `[OWNER] ${message}`);
      break;
    case 'success':
      botLogger.info(`[SUCCESS] ${message}`);
      break;
    default:
      botLogger.info(message);
  }
  
  // Restore original silent state
  botLogger.transports.forEach(t => {
    if (t instanceof winston.transports.Console && originalSilentState.console !== undefined) {
      t.silent = originalSilentState.console;
    }
  });
};

/**
 * Log message to file regardless of logging status
 * Used for essential bot information
 * @param {string} message - Message to log
 * @param {string} type - Log level (defaults to 'info')
 */
const logToFile = (message, type = 'info') => {
  const normalizedType = type.toLowerCase();
  
  // Save original silent states
  const originalSilentState = {};
  
  // Temporarily enable file transports
  botLogger.transports.forEach(t => {
    if (t instanceof winston.transports.File) {
      originalSilentState[t.filename] = t.silent;
      t.silent = false;
    }
  });
  
  // Log the message based on type
  switch (normalizedType) {
    case 'error':
      botLogger.error(message);
      break;
    case 'warn':
    case 'warning':
      botLogger.warn(message);
      break;
    case 'debug':
      botLogger.debug(message);
      break;
    case 'trace':
      botLogger.debug(`[TRACE] ${message}`);
      break;
    case 'owner':
      botLogger.log('owner', `[OWNER] ${message}`);
      break;
    case 'success':
      botLogger.info(`[SUCCESS] ${message}`);
      break;
    default:
      botLogger.info(message);
  }
  
  // Restore original silent state
  botLogger.transports.forEach(t => {
    if (t instanceof winston.transports.File && originalSilentState[t.filename] !== undefined) {
      t.silent = originalSilentState[t.filename];
    }
  });
};

/**
 * Log startup message with special formatting for terminal
 * @param {string} message - Message to display during startup
 * @param {string} type - Log level (defaults to 'info')
 */
const logStartup = (message, type = 'info') => {
  // Check if it's ASCII art (starts with spaces or special characters)
  const isAsciiArt = /^\s*[_\\/|\\[\]{}()<>]/.test(message);
  
  // Format the message
  const formattedMessage = isAsciiArt ? `ASCII Art: ${message}` : message;
  
  // // Always log to console with special formatting
  // console.log(winston.format.combine(
  //   startupFormat
  // ).transform({ 
  //   level: type, 
  //   message: formattedMessage 
  // }).message);
  
  // Also log to file with normal formatting
  logToFile(message, type);
};

module.exports = {
  botLogger,
  baileysLogger,
  log,
  logAlways,
  logToFile,
  logStartup,
  toggleDebug,
  getDebugStatus,
  toggleLogging,
  getLoggingStatus,
  setLogLevel,
  levels: Object.keys(logLevels.levels)
};