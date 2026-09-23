// Runs the wanted-post matcher once, right now.
//
//   npm run match:run
//
// The same thing the hourly job does, minus Bull and minus Redis — which is
// the point. Without REDIS_URL no background job runs at all, so on a
// machine with no Redis there is otherwise no way to see this work; you post
// a wanted request, nothing happens, and nothing says why.
//
// Unlike `match:compare`, this is the real thing: it WRITES notifications
// and moves `lastNotifiedAt`, so a post it matches will not match again
// until something new is listed. Use match:compare to look, this to do.

require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const { runWantedMatches } = require('../src/services/wantedMatch.service');
  const { describe } = require('../src/matchers/embedder');
  const Notification = require('../src/models/Notification');

  console.log(`\nMatcher: ${process.env.WANTED_MATCHER || 'keyword'} (embedder: ${describe().name})`);

  const before = await Notification.countDocuments({ type: 'wanted_match' });
  const result = await runWantedMatches();
  const after = await Notification.countDocuments({ type: 'wanted_match' });

  console.log(`Checked ${result.checked} open wanted post(s), notified ${result.notified}.`);
  console.log(`Notifications: ${before} -> ${after}`);

  if (after > before) {
    const fresh = await Notification.find({ type: 'wanted_match' })
      .sort({ createdAt: -1 })
      .limit(after - before)
      .lean();
    console.log('\nWhat was sent:');
    fresh.forEach((n) => console.log(`   ${n.message}\n      -> ${n.link}`));
    console.log('\nOpen the bell on the site to see them.');
  } else if (result.checked === 0) {
    console.log('\nNo open wanted posts. Every post is either fulfilled or expired.');
  } else {
    console.log('\nNothing matched, or everything matching was already notified.');
    console.log('`npm run match:compare` shows what each matcher can see right now.');
  }

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
