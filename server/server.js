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

const start = async () => {
  await connectDB();

  await Promise.all([
    scheduleExpireListingsJob(),
    scheduleSavedSearchAlertJob(),
    scheduleBumpExpiryJob(),
  ]);

  server.listen(PORT, () => {
    console.log(`Campus Connect server running on port ${PORT}`);
  });
};

start();
