// "Goes with this" — the cross-sell.
//
// The generator is stubbed by registering a provider in the seam
// (`generators/index.js` exports PROVIDERS) and forcing it with GENERATOR.
// No test reaches the network, and none needs to: what is worth pinning here
// is not whether a model gives good answers — it is that whatever a model
// says, only real listings can reach a student's screen, and that the page
// still works when there is no model at all.

require('../helpers/env');

const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { makeUser, makeListing } = require('../helpers/factory');
const { PROVIDERS } = require('../../src/generators');
const {
  buildFor,
  goesWithFor,
  runCrossSell,
  buildPrompt,
  pick,
  MAX_SUGGESTIONS,
} = require('../../src/services/crossSell.service');
const Listing = require('../../src/models/Listing');

before(startDb);
after(stopDb);

// --- stub generator, plugged into the real seam ---------------------------

const useGenerator = (impl) => {
  PROVIDERS.test = {
    isAvailable: () => true,
    describe: () => ({ name: 'test', model: 'test:stub' }),
    generateJson: impl,
  };
  process.env.GENERATOR = 'test';
};

const noGenerator = () => {
  process.env.GENERATOR = 'missing';
};

afterEach(() => {
  delete process.env.GENERATOR;
  delete PROVIDERS.test;
});

let seller;

beforeEach(async () => {
  await clearDb();
  seller = await makeUser();
});

const active = (title, extra = {}) =>
  makeListing(seller._id, { title, status: 'active', price: 500, ...extra });

// --- the guard ------------------------------------------------------------

// `pick` is the reason this feature can be trusted. A model asked for
// numbers can return anything; what gets stored must only ever be listings
// it was actually shown.
describe('only listings the model was shown can come back', () => {
  const candidates = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];

  test('a valid pick maps to the listing at that position', () => {
    const out = pick([{ n: 2, reason: 'goes with it' }], candidates);
    assert.deepEqual(out, [{ listingId: 'b', reason: 'goes with it' }]);
  });

  test('a number outside the list is dropped, not guessed at', () => {
    assert.deepEqual(pick([{ n: 99 }, { n: 0 }, { n: -1 }], candidates), []);
  });

  test('made-up ids cannot be smuggled in', () => {
    // The model is never given ids and has nowhere to put one. Even so:
    const out = pick([{ listingId: 'totally-invented', reason: 'x' }], candidates);
    assert.deepEqual(out, []);
  });

  test('the same listing twice is counted once', () => {
    const out = pick([{ n: 1, reason: 'a' }, { n: 1, reason: 'again' }], candidates);
    assert.equal(out.length, 1);
  });

  test('junk in the response does not throw', () => {
    assert.deepEqual(pick(null, candidates), []);
    assert.deepEqual(pick([null, 'nonsense', {}, { n: 'two' }], candidates), []);
  });

  test('a runaway answer is capped', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ n: (i % 3) + 1, reason: 'x' }));
    assert.ok(pick(many, candidates).length <= MAX_SUGGESTIONS);
  });

  test('a rambling reason is trimmed rather than stored whole', () => {
    const out = pick([{ n: 1, reason: 'x'.repeat(500) }], candidates);
    assert.ok(out[0].reason.length <= 140);
  });
});

// --- retrieval actually reaches the prompt --------------------------------

describe('what the model is given', () => {
  test('the prompt carries the real listings, which is what makes it grounded', () => {
    const prompt = buildPrompt(
      { title: 'Redmi Note 12', price: 8000, description: 'Two years old.' },
      [
        { _id: '1', title: 'Silicone back cover', price: 150 },
        { _id: '2', title: 'iPhone 11', price: 16000 },
      ]
    );

    assert.match(prompt, /Redmi Note 12/);
    assert.match(prompt, /1\. Silicone back cover — ₹150/);
    assert.match(prompt, /2\. iPhone 11 — ₹16000/);
    // The instruction that stops it recommending a substitute.
    assert.match(prompt, /not pick alternatives/i);
  });
});

// --- end to end through the service ---------------------------------------

describe('building the suggestions', () => {
  test('a generated answer is stored against the listing', async () => {
    const phone = await active('Redmi Note 12, 128GB');
    const cover = await active('Silicone back cover for Redmi Note 12', { price: 150 });

    useGenerator(async (prompt) => {
      const n = prompt.split('\n').findIndex((l) => l.includes('Silicone back cover'));
      assert.ok(n > 0, 'the cover must be among the candidates');
      const number = Number(prompt.match(/ {2}(\d+)\. Silicone back cover/)[1]);
      return { picks: [{ n: number, reason: 'Keeps it from cracking.' }] };
    });

    const result = await buildFor(phone);

    assert.equal(result.source, 'generated');
    assert.equal(result.items.length, 1);
    assert.equal(String(result.items[0].listingId), String(cover._id));

    const stored = await Listing.findById(phone._id).select('+goesWith').lean();
    assert.equal(stored.goesWith.source, 'generated');
    assert.equal(stored.goesWith.items[0].reason, 'Keeps it from cracking.');
  });

  // The rule the whole design rests on: no model, still a feature.
  test('with no generator at all, the hand-written map answers', async () => {
    noGenerator();
    const phone = await active('Redmi Note 12, 128GB');
    await active('Silicone back cover for Redmi Note 12', { price: 150 });

    const result = await buildFor(phone);

    assert.equal(result.source, 'map');
    assert.ok(result.items.length > 0, 'a missing model must not mean a missing feature');
  });

  test('a generator that throws falls through to the map', async () => {
    useGenerator(async () => {
      throw new Error('503 high demand');
    });
    const phone = await active('Redmi Note 12, 128GB');
    await active('Silicone back cover for Redmi Note 12', { price: 150 });

    assert.equal((await buildFor(phone)).source, 'map');
  });

  test('a generator that picks nothing falls through to the map', async () => {
    useGenerator(async () => ({ picks: [] }));
    const phone = await active('Redmi Note 12, 128GB');
    await active('Silicone back cover for Redmi Note 12', { price: 150 });

    assert.equal((await buildFor(phone)).source, 'map');
  });

  test('a board with nothing else on it suggests nothing', async () => {
    useGenerator(async () => ({ picks: [{ n: 1, reason: 'x' }] }));
    const lonely = await active('Redmi Note 12, 128GB');

    const result = await buildFor(lonely);
    assert.equal(result.items.length, 0);
    assert.equal(result.source, 'none');
  });

  test('a listing never goes with itself', async () => {
    useGenerator(async (prompt) => {
      assert.equal(prompt.includes('Redmi Note 12, 128GB —'), true, 'it is the subject');
      // It must not also appear in the numbered candidate list.
      assert.equal(/\d+\. Redmi Note 12, 128GB/.test(prompt), false);
      return { picks: [] };
    });

    const phone = await active('Redmi Note 12, 128GB');
    await active('Cycle lock with keys');
    await buildFor(phone);
  });
});

// --- what the page gets ---------------------------------------------------

describe('reading it back', () => {
  test('a suggestion that has since sold is not shown', async () => {
    noGenerator();
    const phone = await active('Redmi Note 12, 128GB');
    const cover = await active('Silicone back cover for Redmi Note 12', { price: 150 });

    await buildFor(phone);
    assert.ok((await goesWithFor(phone._id)).items.length > 0);

    // The cache can be a week old; the board moves under it.
    await Listing.updateOne({ _id: cover._id }, { $set: { status: 'sold' } });

    const after = await goesWithFor(phone._id);
    assert.equal(
      after.items.some((i) => String(i.listing._id) === String(cover._id)),
      false,
      'recommending something already gone is worse than recommending nothing'
    );
  });

  test('a listing nothing has been built for yet is empty, not an error', async () => {
    const fresh = await active('Something new');
    const out = await goesWithFor(fresh._id);

    assert.deepEqual(out.items, []);
    assert.equal(out.source, 'none');
  });

  // The empty state is the feature. On a board this size most listings have
  // no companion for sale, and "nobody is selling a chair — ask for one?" is
  // worth more than a hidden section: the ask becomes a wanted post, which
  // the matcher answers the moment somebody lists one.
  test('what nobody is selling is named, so it can be asked for', async () => {
    noGenerator();
    const table = await active('Study table with three drawers');

    const { items, missing } = await goesWithFor(table._id);

    assert.equal(items.length, 0, 'nothing on this board goes with it');
    assert.ok(missing.length > 0, 'but we know what would');
    assert.ok(
      missing.some((m) => /chair/i.test(m.label)),
      `a table wants a chair — got ${missing.map((m) => m.label).join(', ')}`
    );
    assert.ok(missing[0].query, 'and the wording to ask with');
  });

  test('nothing is offered to ask for when it is already on the board', async () => {
    noGenerator();
    const table = await active('Study table with three drawers');
    await active('Revolving study chair');
    await buildFor(table);

    const { items, missing } = await goesWithFor(table._id);

    assert.ok(items.some((i) => /chair/i.test(i.listing.title)), 'the chair is suggested');
    assert.equal(
      missing.some((m) => /chair/i.test(m.label)),
      false,
      'and must not also be offered as a thing to ask for'
    );
  });

  test('what comes back is enough to draw a card', async () => {
    noGenerator();
    const phone = await active('Redmi Note 12, 128GB');
    await active('Silicone back cover for Redmi Note 12', { price: 150 });
    await buildFor(phone);

    const { items } = await goesWithFor(phone._id);
    assert.ok(items[0].listing.title);
    assert.equal(typeof items[0].listing.price, 'number');
    assert.ok(items[0].reason);
  });

  // 768 doubles plus a suggestion list is more than the listing itself.
  test('none of this rides along on an ordinary listing read', async () => {
    noGenerator();
    const phone = await active('Redmi Note 12, 128GB');
    await active('Silicone back cover for Redmi Note 12', { price: 150 });
    await buildFor(phone);

    const asBrowseSeesIt = await Listing.findById(phone._id).lean();
    assert.equal(asBrowseSeesIt.goesWith, undefined);
  });
});

describe('the hourly pass', () => {
  test('it fills in what has none and leaves the rest alone', async () => {
    noGenerator();
    await active('Redmi Note 12, 128GB');
    await active('Silicone back cover for Redmi Note 12', { price: 150 });

    const first = await runCrossSell();
    assert.equal(first.checked, 2);

    const second = await runCrossSell();
    assert.equal(second.checked, 0, 'nothing outstanding the second time');
  });

  test('sold listings are not worked on', async () => {
    noGenerator();
    await active('Redmi Note 12, 128GB', { status: 'sold' });

    assert.equal((await runCrossSell()).checked, 0);
  });
});
