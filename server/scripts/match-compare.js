// Runs both matchers over the same board and prints what each one found.
//
//   npm run match:compare                       -- every open wanted post
//   npm run match:compare -- "need a laptop"    -- ad-hoc queries
//
// This exists because "the semantic matcher is better" is an assertion, and
// switching WANTED_MATCHER on an assertion is how you end up with worse
// alerts and no idea why. Two columns over your own listings is evidence.
//
// What to look for:
//   * rows where semantic found something keyword missed  -> the case for it
//   * rows where semantic found something wrong           -> lower it? or the
//                                                            threshold is off
//   * the score column                                    -> SEMANTIC_THRESHOLD
//     wants to sit above the junk and below the real matches. It ships at
//     0.45, which is a starting point and not a measurement.
//
// Reads listings and wanted posts. The only thing it writes is the embedding
// cache on rows the semantic matcher had to embed — exactly what the hourly
// job would have written, additive, and not visible in the product.

require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const keyword = require('../src/matchers/keyword.matcher');
const semantic = require('../src/matchers/semantic.matcher');
const embedder = require('../src/matchers/embedder');

const queries = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const show = (label, matches) => {
  console.log(`   ${label.padEnd(9)} ${matches.length === 0 ? '(nothing)' : ''}`);
  for (const m of matches) {
    const why = m.shared.length ? `  on: ${m.shared.join(', ')}` : '';
    console.log(`             ${m.score.toFixed(2)}  ${m.listing.title}${why}`);
  }
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const Listing = require('../src/models/Listing');
  const LookingFor = require('../src/models/LookingFor');
  const User = require('../src/models/User');

  const active = await Listing.countDocuments({ status: 'active' });
  console.log(`\n${active} active listing(s) to match against.`);

  if (!embedder.isAvailable()) {
    console.log(
      '\nNo embedding provider configured (OPENAI_API_KEY), so the semantic\n' +
        'column below is the keyword matcher falling back. That is the real\n' +
        'behaviour, but it is not a comparison — set a real key to get one.'
    );
  } else {
    const { model, dimensions } = embedder.describe();
    console.log(`Embedding with ${model} at ${dimensions} dimensions.`);
  }

  let subjects;

  if (queries.length) {
    // A throwaway id so the "not your own listing" rule cannot exclude
    // anything: nobody owns this.
    const nobody = new mongoose.Types.ObjectId();
    subjects = queries.map((title) => ({ title, userId: nobody, _id: nobody }));
    console.log(`Comparing ${subjects.length} ad-hoc quer(y/ies).\n`);
  } else {
    subjects = await LookingFor.find({ status: 'open', expiresAt: { $gt: new Date() } })
      .select('+embedding')
      .limit(50);
    console.log(`Comparing ${subjects.length} open wanted post(s).\n`);

    if (subjects.length === 0) {
      console.log(
        'No open wanted posts. Pass some queries instead, e.g.\n' +
          '  npm run match:compare -- "need a laptop" "something to study on"\n'
      );
      await mongoose.disconnect();
      return;
    }
  }

  let keywordOnly = 0;
  let semanticOnly = 0;
  let both = 0;

  for (const wanted of subjects) {
    const who = wanted.userId && !queries.length ? await User.findById(wanted.userId).lean() : null;
    console.log(`"${wanted.title}"${who ? `  — ${who.name}` : ''}`);

    const [k, s] = [
      await keyword.findMatches(wanted, { since: null, limit: 5 }),
      await semantic.findMatches(wanted, { since: null, limit: 5 }),
    ];

    show('keyword', k);
    show('semantic', s);

    const kIds = new Set(k.map((m) => String(m.listing._id)));
    const sIds = new Set(s.map((m) => String(m.listing._id)));
    const onlyS = [...sIds].filter((id) => !kIds.has(id)).length;
    const onlyK = [...kIds].filter((id) => !sIds.has(id)).length;

    semanticOnly += onlyS;
    keywordOnly += onlyK;
    both += [...sIds].filter((id) => kIds.has(id)).length;

    if (onlyS) console.log(`   -> semantic found ${onlyS} the word list missed`);
    if (onlyK) console.log(`   -> keyword found ${onlyK} semantic did not`);
    console.log('');
  }

  console.log('---');
  console.log(`both agreed on   ${both}`);
  console.log(`semantic only    ${semanticOnly}   <- what switching would gain`);
  console.log(`keyword only     ${keywordOnly}   <- what switching would lose`);
  console.log(
    '\nCheck the "semantic only" rows by eye before switching. A bigger\n' +
      'number is only better if those matches are ones a student would want.\n'
  );

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
