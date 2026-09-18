const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  // Under test, connect only if something actually issues a command. This
  // module is imported by auth.controller, so without it every test process
  // would open a socket to a broker that is not there, retry forever, and
  // keep the runner alive after the last assertion had passed.
  ...(process.env.NODE_ENV === 'test' ? { lazyConnect: true, enableOfflineQueue: false } : {}),
});

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
      `Redis unreachable at ${REDIS_URL}: ${err.message}\n` +
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
