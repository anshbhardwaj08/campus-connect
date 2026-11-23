// Re-reads wanted posts written before the board knew about renting.
//
//   npm run wanted:retype            (dry run — prints what it would change)
//   npm run wanted:retype -- --commit
//
// `LookingFor.listingType` defaults to 'sale', which is right for almost
// every post and wrong for the ones that were asking to borrow something.
// Those posts have been invisible in a specific way: a live one reads
// "cycle", budget ₹100, description "for one hour", and it was scored against
// ₹4,200 sale prices. It matched nothing, and nothing in a log said why.
//
// The wording is all there is to go on, so that is what this reads. It is a
// guess, which is why it prints before it writes and why it only ever moves
// a post from 'sale' to 'rent' — never the other way, and never over a post
// somebody has already set deliberately.
//
// Hours map to 'day', because no listing on the board is priced by the hour:
// Listing.rentPeriod is day | week | month. Somebody wanting a drafter for an
// afternoon is best served by the day rate, and the alternative is an 'hour'
// period that nothing would ever match.

require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const commit = process.argv.slice(2).includes('--commit');

// Rent, borrow, hire, lend; and the time-bounded phrasings people actually
// use, which are the giveaway even when the word "rent" never appears.
const RENT_WORDING =
  /\b(rent|rents|rental|renting|borrow|borrowing|hire|hiring|lend|loan)\b|\bfor (an?|one|1|two|2|a few) (hour|hours|day|days|week|weeks|weekend|month|months|semester)\b|\bper (hour|day|week|month)\b|\b(hourly|daily|weekly|monthly)\b|\bjust for (the|a|an|one)\b/i;

// First match wins, so the order is shortest span to longest — "for a day or
// two" should read as a day, not get caught by a later pattern.
const PERIOD_WORDING = [
  [/\b(hour|hours|hourly|afternoon|evening|day|days|daily|weekend)\b/i, 'day'],
  [/\b(week|weeks|weekly)\b/i, 'week'],
  [/\b(month|months|monthly|semester|term|year)\b/i, 'month'],
];

const readPeriod = (text) => {
  for (const [pattern, period] of PERIOD_WORDING) {
    if (pattern.test(text)) return period;
  }
  return null;
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 15000,
  });
  const LookingFor = require('../src/models/LookingFor');

  // Only posts still sitting at the default. A post explicitly set to 'rent'
  // is already right, and one somebody set to 'sale' on the new form is a
  // decision, not a gap — but those two are indistinguishable in the data,
  // which is the honest cost of defaulting rather than requiring. Re-running
  // this cannot make things worse: a post it moved is no longer 'sale'.
  const posts = await LookingFor.find({ listingType: { $ne: 'rent' } })
    .select('title description maxBudget listingType rentPeriod createdAt')
    .lean();

  const changing = [];

  for (const post of posts) {
    const text = `${post.title || ''} ${post.description || ''}`;
    if (!RENT_WORDING.test(text)) continue;
    changing.push({ post, rentPeriod: post.rentPeriod || readPeriod(text) });
  }

  console.log(`\nWanted posts read: ${posts.length}`);
  console.log(`Reading as rental wants: ${changing.length}\n`);

  for (const { post, rentPeriod } of changing) {
    const budget = post.maxBudget ? `₹${post.maxBudget}` : 'no budget';
    console.log(`  "${post.title}" — ${budget}${rentPeriod ? ` per ${rentPeriod}` : ', period unclear'}`);
    if (post.description) console.log(`      ${post.description.slice(0, 90)}`);
  }

  if (changing.length === 0) {
    console.log('  (nothing to change)');
  }

  if (!commit) {
    console.log('\nDry run. Nothing written. Re-run with --commit to apply.\n');
    await mongoose.disconnect();
    return;
  }

  for (const { post, rentPeriod } of changing) {
    await LookingFor.updateOne(
      { _id: post._id },
      // `rentPeriod` is left unset when the wording did not say. The matcher
      // handles that — it filters by type and skips the budget comparison,
      // rather than inventing a unit.
      { $set: { listingType: 'rent', ...(rentPeriod ? { rentPeriod } : {}) } }
    );
  }

  console.log(`\nUpdated ${changing.length} post(s).`);
  console.log('Run `npm run match:run` to let the matcher have another go at them.\n');
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
