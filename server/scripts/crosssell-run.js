// Fills in "Goes with this" for every listing, right now.
//
//   npm run crosssell:run            the outstanding ones (what the job does)
//   npm run crosssell:run -- --all   every active listing, ignoring the cache
//
// Same reason `match:run` exists: without REDIS_URL no background job runs,
// so on a machine with no Redis there is otherwise no way to see this work.
//
// This WRITES: it stores the suggestions on each listing. That is the point —
// afterwards the listing page has something to show, with no model in the
// request path.

require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const all = process.argv.includes('--all');

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const Listing = require('../src/models/Listing');
  const generator = require('../src/generators');
  const { runCrossSell, buildFor, goesWithFor } = require('../src/services/crossSell.service');

  console.log(`\nGenerator: ${generator.describe().name} (${generator.describe().model})`);
  if (!generator.isAvailable()) {
    console.log('Not configured — every listing will fall back to the hand-written');
    console.log('companion map. That works, but it is a recommender, not RAG.');
  }

  let result;

  if (all) {
    // Ignores the cache. Used after editing the prompt or the companion map,
    // when the stored answers are the thing you want to replace.
    const listings = await Listing.find({ status: 'active' }).lean();
    const counts = { generated: 0, map: 0, none: 0 };
    for (const listing of listings) {
      const { source } = await buildFor(listing);
      counts[source] += 1;
    }
    result = { checked: listings.length, ...counts };
  } else {
    result = await runCrossSell({ limit: 50 });
  }

  console.log(
    `\nChecked ${result.checked}: ${result.generated} generated, ` +
      `${result.map} from the map, ${result.none} with nothing to suggest.`
  );

  // Print what a student would actually see, because a count of 12 tells you
  // nothing about whether the suggestions are any good.
  const withAny = await Listing.find({ status: 'active', 'goesWith.items.0': { $exists: true } })
    .select('title')
    .limit(8)
    .lean();

  for (const listing of withAny) {
    const { items, source } = await goesWithFor(listing._id);
    if (!items.length) continue;
    console.log(`\n${listing.title}   [${source}]`);
    items.forEach((i) => console.log(`   + ${i.listing.title} — ₹${i.listing.price}\n     ${i.reason}`));
  }

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
