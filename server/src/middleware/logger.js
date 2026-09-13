const morgan = require('morgan');
const winston = require('winston');
const path = require('path');

const winstonLogger = winston.createLogger({
  level: 'info',
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
