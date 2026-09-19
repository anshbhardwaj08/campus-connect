const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// For logs only: the URL with its password masked. The raw URL carries the
// credential (redis://user:PASSWORD@host), and it used to be printed in full
// on the first connection error — straight into the deploy logs.
const REDIS_URL_SAFE = REDIS_URL.replace(/\/\/([^:@/]*):[^@/]*@/, '//$1:***@');

// Reconnect backoff: 1s, 2s, 4s ... capped at 30s, for every Redis
// connection the server opens (this one and Bull's, in jobs/queue.js).
//
// It counts failures itself instead of using ioredis's `times`. A full Redis
// ("max number of clients reached") accepts the TCP connection and only then
// refuses AUTH; ioredis counts the TCP connect as a success and resets
// `times`, so its backoff never grew past the first step. 'ready' is no
// better a signal: Bull's connections need enableReadyCheck off, and then
// 'ready' fires before AUTH is even answered. So a failure only stops
// counting once the connection has actually stayed up for 30s. Measured
// against a Redis refusing every client: ~6 reconnects a second from one
// server before this, a handful a minute after.
const STABLE_MS = 30_000;
const withBackoff = (connection) => {
  let failures = 0;
  let readyAt = 0;
  connection.on('ready', () => {
    readyAt = Date.now();
  });
  connection.options.retryStrategy = () => {
    if (readyAt && Date.now() - readyAt >= STABLE_MS) failures = 0;
    readyAt = 0;
    failures += 1;
    return Math.min(1000 * 2 ** Math.min(failures - 1, 5), 30_000);
  };
  return connection;
};

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  // Under test, connect only if something actually issues a command. This
  // module is imported by auth.controller, so without it every test process
  // would open a socket to a broker that is not there, retry forever, and
  // keep the runner alive after the last assertion had passed.
  ...(process.env.NODE_ENV === 'test' ? { lazyConnect: true, enableOfflineQueue: false } : {}),
});

withBackoff(redisClient);

redisClient.on('connect', () => {
  console.log('Redis connected');
});

// ioredis retries forever, so a dead broker emits an error on every attempt
// and drowns out everything else in the console. Log the first failure with
// what it actually means, then throttle repeats to once a minute.
let loggedOnce = false;
let lastLoggedAt = 0;
const THROTTLE_MS = 60_000;

redisClient.on('error', (err) => {
  const now = Date.now();

  if (!loggedOnce) {
    loggedOnce = true;
    lastLoggedAt = now;
    console.error(
      `Redis unreachable at ${REDIS_URL_SAFE}: ${err.message}\n` +
        '  The API still serves requests — Redis only backs OTP storage, caching\n' +
        '  and the Bull job queues. Phone OTP verification will fail until it is up.'
    );
    return;
  }

  if (now - lastLoggedAt >= THROTTLE_MS) {
    lastLoggedAt = now;
    console.error(`Redis still unreachable: ${err.message}`);
  }
});

redisClient.on('ready', () => {
  loggedOnce = false;
});

module.exports = redisClient;
module.exports.withBackoff = withBackoff;
