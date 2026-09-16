// Every background queue is built here, so they all get the one thing Bull
// does not give you by default: an `error` listener.
//
// Without one, Node treats a Redis problem as an unhandled 'error' event and
// kills the process. That directly contradicts what server.js sets out —
// none of these jobs sit on a request path, so a Redis outage must never
// stop the API from serving. It brought the server down once: the free tier
// hit its connection cap and the whole thing exited.
//
// Only `err.message` is logged, never the error object. An ioredis auth
// failure carries the command that failed, and for AUTH that means the
// Redis password sits in the payload — printing it would write the
// credential into the log file.

const Queue = require('bull');
const { winstonLogger } = require('../middleware/logger');

const createQueue = (name) => {
  const queue = new Queue(name, process.env.REDIS_URL);

  queue.on('error', (err) => {
    winstonLogger.error(`Queue ${name} unavailable: ${err.message}`);
  });

  queue.on('failed', (job, err) => {
    winstonLogger.error(`Queue ${name} job ${job?.id} failed: ${err.message}`);
  });

  return queue;
};

module.exports = { createQueue };
