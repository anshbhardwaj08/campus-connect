const Queue = require('bull');
const Listing = require('../models/Listing');

const bumpExpiryQueue = new Queue('bumpExpiry', process.env.REDIS_URL);

bumpExpiryQueue.process(async () => {
  const result = await Listing.updateMany(
    { isBumped: true, bumpExpiry: { $lte: new Date() } },
    { $set: { isBumped: false }, $unset: { bumpExpiry: '' } }
  );
  console.log(`bumpExpiry job: unset bump on ${result.modifiedCount} listing(s)`);
  return result.modifiedCount;
});

const scheduleBumpExpiryJob = async () => {
  await bumpExpiryQueue.add(
    {},
    { repeat: { cron: '0 * * * *' }, removeOnComplete: true, removeOnFail: true } // hourly
  );
};

module.exports = { bumpExpiryQueue, scheduleBumpExpiryJob };
