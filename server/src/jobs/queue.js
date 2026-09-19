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

//
// Connections are shared, too. By default every Bull queue opens three Redis
// connections (client, subscriber, blocking client): four queues plus the
// OTP client came to 13 per server. The free Redis plan caps at 30, and
// during a Render deploy the old and new instances overlap — with a laptop
// dev server on the same Redis that went past the cap, and the deploy
// crashed with "ERR max number of clients reached". Sharing the client and
// subscriber across queues (Bull's documented createClient pattern) brings
// it to 7. The blocking client cannot be shared; Bull needs one per queue.

const Queue = require('bull');
const Redis = require('ioredis');
const { winstonLogger } = require('../middleware/logger');

// Bull refuses shared subscriber/blocking connections that keep these on.
// The backoff matters as much: with ioredis's default, a Redis that refuses
// connections ("max number of clients reached") was retried ~80 times a
// second, which keeps it full and floods the log. Wait longer after each
// failure, up to 30s.
const { withBackoff } = require('../config/redis');
const CONNECTION_OPTIONS = { maxRetriesPerRequest: null, enableReadyCheck: false };

const shared = {};
const connect = (role) => {
  const connection = withBackoff(new Redis(process.env.REDIS_URL, CONNECTION_OPTIONS));
  // Each connection gets its own listener: an ioredis 'error' with none
  // attached is an unhandled event, and that kills the process.
  connection.on('error', (err) => winstonLogger.error(`Redis (${role}) unavailable: ${err.message}`));
  return connection;
};

const createClient = (type) => {
  if (type === 'client' || type === 'subscriber') {
    shared[type] = shared[type] || connect(`shared ${type}`);
    return shared[type];
  }
  return connect('queue worker');
};

const createQueue = (name) => {
  const queue = new Queue(name, { createClient });

  queue.on('error', (err) => {
    winstonLogger.error(`Queue ${name} unavailable: ${err.message}`);
  });

  queue.on('failed', (job, err) => {
    winstonLogger.error(`Queue ${name} job ${job?.id} failed: ${err.message}`);
  });

  // process() returns a promise that rejects if the worker connection is
  // refused — and nothing that calls it waits on it. Unhandled, that
  // rejection is what actually took the server down: Node exits on one.
  const startProcessing = queue.process.bind(queue);
  queue.process = (...args) => {
    const running = startProcessing(...args);
    Promise.resolve(running).catch((err) =>
      winstonLogger.error(`Queue ${name} worker could not start: ${err.message}`)
    );
    return running;
  };

  return queue;
};

module.exports = { createQueue };
