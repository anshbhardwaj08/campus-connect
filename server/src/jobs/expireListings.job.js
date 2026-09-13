const Queue = require('bull');
const Listing = require('../models/Listing');

const expireListingsQueue = new Queue('expireListings', process.env.REDIS_URL);

expireListingsQueue.process(async () => {
  const result = await Listing.updateMany(
    { status: 'active', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );
  console.log(`expireListings job: marked ${result.modifiedCount} listing(s) as expired`);
  return result.modifiedCount;
});

const scheduleExpireListingsJob = async () => {
  await expireListingsQueue.add(
    {},
    { repeat: { cron: '0 0 * * *' }, removeOnComplete: true, removeOnFail: true } // daily at midnight
  );
};

module.exports = { expireListingsQueue, scheduleExpireListingsJob };
