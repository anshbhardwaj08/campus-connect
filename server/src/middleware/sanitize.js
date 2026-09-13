const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const sanitizeMiddleware = [mongoSanitize(), xss()];

module.exports = sanitizeMiddleware;
