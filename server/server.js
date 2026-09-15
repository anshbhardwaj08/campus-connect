require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const connectDB = require('./src/config/db');
const setupSocket = require('./src/sockets/events');
const { scheduleExpireListingsJob } = require('./src/jobs/expireListings.job');
const { scheduleSavedSearchAlertJob } = require('./src/jobs/savedSearchAlert.job');
const { scheduleBumpExpiryJob } = require('./src/jobs/bumpExpiry.job');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
    credentials: true,
  },
});

setupSocket(io);

// Background job queues live on Redis (Bull). None of them sit on a request
// path, so a Redis outage must never stop the API from serving — previously
// these were awaited before listen(), which meant an unreachable Redis hung
// the boot forever and every request failed with no response at all.
//
// Bull retries indefinitely rather than rejecting, so these promises may
// simply stay pending until Redis comes back. That is fine: nothing waits
// on them.
const scheduleBackgroundJobs = () => {
  const jobs = [
    ['expireListings', scheduleExpireListingsJob],
    ['savedSearchAlert', scheduleSavedSearchAlertJob],
    ['bumpExpiry', scheduleBumpExpiryJob],
  ];

  jobs.forEach(([name, schedule]) => {
    Promise.resolve()
      .then(schedule)
      .then(() => console.log(`Scheduled ${name} job`))
      .catch((err) => console.error(`Could not schedule ${name} job: ${err.message}`));
  });
};

const start = async () => {
  // The database IS on the request path, so this one is still awaited.
  await connectDB();

  // listen() reports failure by emitting 'error', not by rejecting — so
  // without this handler a busy port crashes the process with a raw
  // EADDRINUSE stack trace that says nothing useful.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use — another server is probably still running.`);
      console.error('  Stop it, or set PORT in server/.env to something else.');
    } else {
      console.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`Campus Connect server running on port ${PORT}`);
  });

  scheduleBackgroundJobs();
};

start().catch((err) => {
  console.error(`Server failed to start: ${err.message}`);
  process.exit(1);
});
