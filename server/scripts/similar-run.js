// What "more like this" actually finds, on the real board.
//
//   npm run similar:run              the score distribution, and the pairs
//   npm run similar:run -- --pairs   every pair above the floor, not just the tops
//
// READ ONLY. It writes nothing and calls no provider: the whole point of
// `similarTo` is that it compares vectors the hourly job already wrote, so
// this script can only ever see what a listing page would see.
//
// It exists for one decision — where SIMILAR_THRESHOLD goes. A threshold
// picked by feel is a threshold nobody can defend later, and the number
// that is right for a short query against a listing is the wrong number for
// two listings against each other.
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const showPairs = process.argv.includes('--pairs');

// Deliberately below any plausible threshold: the question this script
// answers is where the line belongs, so it has to show scores on both
// sides of it.
const FLOOR = 0.5;

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 15000 });

  const Listing = require('../src/models/Listing');
  const embedder = require('../src/matchers/embedder');
  const { cosine, sourceHash, isFresh } = require('../src/matchers/vector');
  const { SIMILAR_THRESHOLD } = require('../src/matchers/retrieve');

  const model = embedder.describe().model;
  console.log(`\nEmbedder: ${embedder.describe().name} (${model})`);
  console.log(`SIMILAR_THRESHOLD is currently ${SIMILAR_THRESHOLD}\n`);

  const listings = await Listing.find({ status: 'active' }).select('+embedding').lean();
  const fresh = listings.filter((l) =>
    isFresh(l.embedding, sourceHash(l.title, l.description), model)
  );

  console.log(`${listings.length} active listings, ${fresh.length} with a usable vector.`);
  if (fresh.length < listings.length) {
    console.log(
      `${listings.length - fresh.length} have no vector or a stale one — those pages get the ` +
        `fallback row until the hourly job catches up.`
    );
  }
  if (fresh.length < 2) {
    console.log('\nNot enough vectors to compare. Run the matcher job first.');
    return;
  }

  // Every pair once. The board is a few hundred listings at most, so this
  // is a few thousand cosines — microseconds, and no reason to sample.
  const pairs = [];
  for (let i = 0; i < fresh.length; i += 1) {
    for (let j = i + 1; j < fresh.length; j += 1) {
      const score = cosine(fresh[i].embedding.vector, fresh[j].embedding.vector);
      if (score >= FLOOR) pairs.push({ a: fresh[i], b: fresh[j], score });
    }
  }
  pairs.sort((x, y) => y.score - x.score);

  // The distribution is the actual output. A threshold is only defensible
  // if there is a gap in the scores to put it in.
  console.log('\nScore distribution (pairs at or above the floor):');
  const buckets = new Map();
  for (const p of pairs) {
    const key = (Math.floor(p.score * 20) / 20).toFixed(2);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  for (const key of [...buckets.keys()].sort().reverse()) {
    const n = buckets.get(key);
    const sameCat = pairs.filter(
      (p) => (Math.floor(p.score * 20) / 20).toFixed(2) === key && p.a.category === p.b.category
    ).length;
    console.log(
      `  ${key}–${(Number(key) + 0.05).toFixed(2)}  ${String(n).padStart(4)} pairs` +
        `   ${String(sameCat).padStart(4)} same category`
    );
  }

  const show = showPairs ? pairs : pairs.slice(0, 25);
  console.log(`\n${showPairs ? 'Every' : 'Closest'} ${show.length} pair(s), closest first:`);
  for (const p of show) {
    const mark = p.score >= SIMILAR_THRESHOLD ? '*' : ' ';
    const cat = p.a.category === p.b.category ? 'same cat' : 'cross   ';
    console.log(`  ${mark} ${p.score.toFixed(3)}  ${cat}  ${p.a.title}`);
    console.log(`              ${' '.repeat(10)}${p.b.title}`);
  }
  console.log(`\n* = would be shown at the current threshold (${SIMILAR_THRESHOLD}).`);

  // The row is price-filtered, so a pair being close is not the same as the
  // row having anything in it. This is the number that decides whether the
  // feature is visible at all.
  //
  // Slightly optimistic on purpose: the controller also subtracts whatever
  // `goesWith` already suggests, which this does not model. Reading it as a
  // ceiling is the right way round.
  let withRow = 0;
  for (const anchor of fresh) {
    const hits = fresh.filter(
      (other) =>
        String(other._id) !== String(anchor._id) &&
        other.listingType === anchor.listingType &&
        other.price <= anchor.price &&
        cosine(anchor.embedding.vector, other.embedding.vector) >= SIMILAR_THRESHOLD
    );
    if (hits.length) withRow += 1;
  }
  console.log(
    `\nAt this threshold, ${withRow} of ${fresh.length} listings would show a ` +
      `"more like this, under ₹X" row.`
  );
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
