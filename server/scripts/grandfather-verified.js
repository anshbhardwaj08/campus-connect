// Marks accounts that pre-date email enforcement as verified.
//
//   npm run grandfather-verified -- --before 2026-09-21           (dry run)
//   npm run grandfather-verified -- --before 2026-09-21 --commit  (writes)
//
// Login now refuses an account whose college address was never verified.
// Before that check existed the verify link was optional, so almost every
// real account on the deployment had ignored it — including the only admin.
// Turning enforcement on without this would have locked everyone out of
// their own product.
//
// Two guards, because this is the one script in here that could quietly
// undo the check it exists to enable:
//
//   --before is required and has no default. It only touches accounts
//   created before that instant, so a student who signs up tomorrow and
//   never verifies cannot be swept in by someone re-running this later.
//
//   It reports and stops unless --commit is passed. The dry run prints
//   exactly which accounts would change.

require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const before = args[args.indexOf('--before') + 1];

const usage = () => {
  console.error('Usage: npm run grandfather-verified -- --before <YYYY-MM-DD> [--commit]');
  process.exit(1);
};

if (!args.includes('--before') || !before || before.startsWith('--')) usage();

const cutoff = new Date(before);
if (Number.isNaN(cutoff.getTime())) {
  console.error(`Not a date: ${before}`);
  usage();
}

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require('../src/models/User');

  const query = { isEmailVerified: { $ne: true }, createdAt: { $lt: cutoff } };
  const affected = await User.find(query).select('name collegeEmail role createdAt').lean();

  // Anyone left unverified AFTER the cutoff is deliberately untouched — they
  // registered under the new rule and have a link waiting in their inbox.
  const newer = await User.countDocuments({
    isEmailVerified: { $ne: true },
    createdAt: { $gte: cutoff },
  });

  console.log(`\nAccounts created before ${cutoff.toISOString()} and still unverified: ${affected.length}`);
  for (const u of affected) {
    console.log(`  ${String(u.role).padEnd(10)} ${u.name}  <${u.collegeEmail}>`);
  }
  if (newer) {
    console.log(`\nLeaving ${newer} unverified account(s) created on or after the cutoff alone.`);
  }

  if (!affected.length) {
    console.log('\nNothing to do.');
  } else if (!commit) {
    console.log('\nDry run. Nothing was written. Add --commit to apply.');
  } else {
    const { modifiedCount } = await User.updateMany(query, { $set: { isEmailVerified: true } });
    console.log(`\nMarked ${modifiedCount} account(s) verified.`);
    console.log('To undo, set isEmailVerified back to false on the accounts listed above.');
  }

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
