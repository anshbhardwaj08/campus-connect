const morgan = require('morgan');
const winston = require('winston');
const path = require('path');

// Quiet under `npm test`: morgan pipes every request through here, and a
// suite of a few hundred requests buries the assertion failures you are
// actually reading. Nothing else changes — the logger is still constructed,
// so any code that logs still runs.
const winstonLogger = winston.createLogger({
  level: 'info',
  silent: process.env.NODE_ENV === 'test',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join('logs', 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join('logs', 'combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const httpLogger = morgan('dev', {
  stream: { write: (message) => winstonLogger.info(message.trim()) },
});

module.exports = { winstonLogger, httpLogger };
