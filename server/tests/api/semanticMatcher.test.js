// The semantic matcher's machinery.
//
// IMPORTANT about what these do and do not prove. The embedder here is a
// stand-in: a handful of axes and a small word table, so that "bike" and
// "cycle" land in the same direction by construction. That is enough to test
// everything this file is actually about — caching, batching, staleness,
// eligibility, and the fallbacks — but it proves nothing about whether real
// embeddings match well. Nothing offline can. For that, put a real key in
// OPENAI_API_KEY and run `npm run match:compare`, which puts both matchers
// over the same board and prints what each found.
//
// No test in here may reach the network. The stub is injected through
// createSemanticMatcher, so the real provider is never constructed.

require('../helpers/env');

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { makeUser, makeListing } = require('../helpers/factory');
const { createSemanticMatcher } = require('../../src/matchers/semantic.matcher');
const LookingFor = require('../../src/models/LookingFor');
const Listing = require('../../src/models/Listing');

before(startDb);
after(stopDb);

// --- the stand-in embedder ------------------------------------------------

const AXES = ['cycle', 'desk', 'laptop', 'cold'];
const WORDS = {
  cycle: 'cycle', bike: 'cycle', bicycle: 'cycle', hercules: 'cycle',
  desk: 'desk', table: 'desk', study: 'desk',
  laptop: 'laptop', thinkpad: 'laptop', computer: 'laptop',
  fridge: 'cold', refrigerator: 'cold', cold: 'cold', freezer: 'cold',
};

const vectorFor = (text) => {
  const words = String(text).toLowerCase().split(/[^a-z]+/);
  return AXES.map((axis) => (words.some((w) => WORDS[w] === axis) ? 1 : 0));
};

const stub = ({ model = 'stub-1', fail = false } = {}) => {
  const calls = [];
  return {
    calls,
    isAvailable: () => true,
    describe: () => ({ name: 'stub', model, dimensions: AXES.length }),
    warnUnavailableOnce: () => {},
    embed: async (texts) => {
      calls.push(texts);
      if (fail) throw new Error('provider exploded');
      return texts.map(vectorFor);
    },
  };
};

const unavailable = () => ({
  calls: [],
  isAvailable: () => false,
  describe: () => ({ name: 'none', model: 'none', dimensions: 0 }),
  warnUnavailableOnce: () => {},
  embed: async () => {
    throw new Error('should never be called');
  },
});

// --- fixtures -------------------------------------------------------------

let student;
let seller;

const makeWanted = (overrides = {}) =>
  LookingFor.create({ userId: student._id, title: 'need a cycle', status: 'open', ...overrides });

beforeEach(async () => {
  await clearDb();
  student = await makeUser();
  seller = await makeUser();
});

// --- what it is for -------------------------------------------------------

describe('matching on meaning', () => {
  test('finds a listing that shares no words with the request', async () => {
    const listing = await makeListing(seller._id, {
      title: 'Hercules Roadeo 26in',
      description: 'Ridden two semesters.',
      status: 'active',
    });
    const matcher = createSemanticMatcher(stub());

    const matches = await matcher.findMatches(await makeWanted({ title: 'need a bicycle' }));

    assert.equal(matches.length, 1);
    assert.equal(String(matches[0].listing._id), String(listing._id));
    assert.ok(matches[0].score >= matcher.THRESHOLD);
  });

  test('leaves alone a listing about something else', async () => {
    await makeListing(seller._id, { title: 'ThinkPad T480 computer', status: 'active' });

    const matches = await createSemanticMatcher(stub()).findMatches(await makeWanted());
    assert.equal(matches.length, 0);
  });

  test('best first, and no more than asked for', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', status: 'active' });
    await makeListing(seller._id, { title: 'bike and study desk together', status: 'active' });
    await makeListing(seller._id, { title: 'another cycle', status: 'active' });

    const matcher = createSemanticMatcher(stub());
    const all = await matcher.findMatches(await makeWanted());
    assert.equal(all.length, 3);
    assert.ok(all[0].score >= all[1].score && all[1].score >= all[2].score);
    // The one that is also about a desk is a weaker answer to "a cycle".
    assert.match(all[2].listing.title, /desk/);

    assert.equal((await matcher.findMatches(await makeWanted(), { limit: 2 })).length, 2);
  });
});

// --- the rules it does not get to bend ------------------------------------

describe('eligibility is not a matcher decision', () => {
  test('never offers somebody their own listing', async () => {
    await makeListing(student._id, { title: 'Hercules bike', status: 'active' });

    assert.equal((await createSemanticMatcher(stub()).findMatches(await makeWanted())).length, 0);
  });

  test('ignores listings that are not up', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', status: 'sold' });

    assert.equal((await createSemanticMatcher(stub()).findMatches(await makeWanted())).length, 0);
  });

  test('respects a stated budget', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', price: 9000, status: 'active' });

    const wanted = await makeWanted({ maxBudget: 3000 });
    assert.equal((await createSemanticMatcher(stub()).findMatches(wanted)).length, 0);
  });

  test('respects `since`', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', status: 'active' });
    const cutoff = new Date(Date.now() + 1000);

    const matches = await createSemanticMatcher(stub()).findMatches(await makeWanted(), {
      since: cutoff,
    });
    assert.equal(matches.length, 0);
  });
});

// --- the part that costs money --------------------------------------------

describe('embedding is cached, not repeated', () => {
  test('a vector is stored on the listing and reused next run', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', status: 'active' });
    const embedder = stub();
    const matcher = createSemanticMatcher(embedder);

    await matcher.findMatches(await makeWanted());

    const stored = await Listing.findOne({ title: 'Hercules bike' }).select('+embedding').lean();
    assert.equal(stored.embedding.vector.length, AXES.length);
    assert.equal(stored.embedding.model, 'stub-1');
    assert.ok(stored.embedding.sourceHash, 'so an edit can be spotted');

    const afterFirst = embedder.calls.length;
    // Same wanted post, same listing: nothing left to embed.
    await matcher.findMatches(await LookingFor.findOne({}).select('+embedding'));
    assert.equal(embedder.calls.length, afterFirst, 'a second run must embed nothing');
  });

  // 256 doubles per listing is larger than the listing itself. Without
  // select:false every browse response would carry one per card.
  test('the vector never leaves the server on an ordinary read', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', status: 'active' });
    await createSemanticMatcher(stub()).findMatches(await makeWanted());

    const asBrowseSeesIt = await Listing.findOne({ title: 'Hercules bike' }).lean();
    assert.equal(asBrowseSeesIt.embedding, undefined);

    const asked = await Listing.findOne({ title: 'Hercules bike' }).select('+embedding').lean();
    assert.ok(asked.embedding.vector.length, 'but it is there when asked for');
  });

  test('everything outstanding goes in one call, not one call each', async () => {
    for (let i = 0; i < 5; i += 1) {
      await makeListing(seller._id, { title: `Hercules bike ${i}`, status: 'active' });
    }
    const embedder = stub();

    await createSemanticMatcher(embedder).findMatches(await makeWanted());

    // One for the wanted post, one batch for the five listings.
    assert.equal(embedder.calls.length, 2);
    assert.equal(embedder.calls[1].length, 5);
  });

  test('an edited listing is embedded again', async () => {
    const listing = await makeListing(seller._id, { title: 'Hercules bike', status: 'active' });
    const embedder = stub();
    const matcher = createSemanticMatcher(embedder);

    await matcher.findMatches(await makeWanted());
    const before = embedder.calls.length;

    await Listing.updateOne({ _id: listing._id }, { $set: { title: 'ThinkPad computer' } });
    await matcher.findMatches(await LookingFor.findOne({}).select('+embedding'));

    assert.ok(embedder.calls.length > before, 'a stale vector must not be trusted');
    const stored = await Listing.findById(listing._id).select('+embedding').lean();
    assert.deepEqual(stored.embedding.vector, vectorFor('ThinkPad computer'));
  });

  // Two vectors from different models are not comparable, and comparing them
  // anyway would produce quietly meaningless scores rather than an error.
  test('changing the embedding model invalidates every stored vector', async () => {
    await makeListing(seller._id, { title: 'Hercules bike', status: 'active' });

    await createSemanticMatcher(stub({ model: 'stub-1' })).findMatches(await makeWanted());

    const second = stub({ model: 'stub-2' });
    await createSemanticMatcher(second).findMatches(await LookingFor.findOne({}).select('+embedding'));

    assert.ok(second.calls.length > 0, 'nothing from the old model may be reused');
    const stored = await Listing.findOne({}).select('+embedding').lean();
    assert.equal(stored.embedding.model, 'stub-2');
  });
});

// --- never worse off for having asked -------------------------------------

describe('falling back', () => {
  test('with no provider configured, the keyword matcher answers', async () => {
    const listing = await makeListing(seller._id, {
      title: 'Hercules Roadeo gear bike',
      status: 'active',
    });

    const matches = await createSemanticMatcher(unavailable()).findMatches(await makeWanted());

    assert.equal(matches.length, 1, 'a missing key must not mean a missing match');
    assert.equal(String(matches[0].listing._id), String(listing._id));
    assert.deepEqual(matches[0].shared, ['cycle'], 'answered by the vocabulary');
  });

  test('a provider that throws mid-run is not fatal either', async () => {
    await makeListing(seller._id, { title: 'Hercules Roadeo gear bike', status: 'active' });

    const matches = await createSemanticMatcher(stub({ fail: true })).findMatches(
      await makeWanted()
    );

    assert.equal(matches.length, 1);
  });

  test('the fallback still honours limit and since', async () => {
    await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    await makeListing(seller._id, { title: 'Hercules cycle', status: 'active' });

    const matcher = createSemanticMatcher(unavailable());
    assert.equal((await matcher.findMatches(await makeWanted(), { limit: 1 })).length, 1);
    assert.equal(
      (await matcher.findMatches(await makeWanted(), { since: new Date(Date.now() + 1000) })).length,
      0
    );
  });
});
