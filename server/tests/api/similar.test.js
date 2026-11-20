// "More like this, under ₹X" — the substitutes row.
//
// It used to be "same category, newest first", which put a laptop under a
// calculator because both are electronics. It now ranks by meaning and
// filters by price, so what is worth pinning is the three rules that keep
// the row honest — nothing dearer, nothing of the other kind, and nothing
// the cross-sell strip directly above it is already showing — plus the
// fallback, because most listings on a young board have no vector yet.
//
// **No provider is stubbed and no network is touched.** `similarTo` only
// ever compares vectors that are already cached on the documents, so these
// tests write their own: hand-made unit vectors whose cosine is exact by
// construction. That means the real retrieval code runs here, arithmetic
// and all, rather than a stand-in for it.
require('../helpers/env');

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeUser, makeListing, makeRental } = require('../helpers/factory');

const Listing = require('../../src/models/Listing');
const embedder = require('../../src/matchers/embedder');
const { sourceHash } = require('../../src/matchers/vector');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

// cosine([1,0,0], [cos t, sin t, 0]) === cos t, so these scores are not
// approximations — they are the number in the name. The threshold is 0.80.
const V_ANCHOR = [1, 0, 0];
const V_095 = [0.95, 0.31224989991991997, 0];
const V_085 = [0.85, 0.5267826876426369, 0];
const V_050 = [0.5, 0.8660254037844386, 0];

// What the hourly job writes. `sourceHash` of the listing's own text and the
// current model name are what make it count as fresh — get either wrong and
// the vector is ignored, which is the staleness rule doing its job.
const withVector = (listing, vector) =>
  Listing.updateOne(
    { _id: listing._id },
    {
      $set: {
        embedding: {
          vector,
          model: embedder.describe().model,
          sourceHash: sourceHash(listing.title, listing.description),
          at: new Date(),
        },
      },
    }
  );

const getRow = async (id) => {
  const res = await client().get(`/listings/${id}/similar`);
  assert.equal(res.status, 200);
  return {
    titles: res.body.data.listings.map((l) => l.title),
    source: res.body.data.source,
  };
};

describe('more like this', () => {
  let seller;

  beforeEach(async () => {
    await clearDb();
    seller = await makeUser({ name: 'Seller' });
  });

  const addListing = (title, extra = {}) =>
    makeListing(seller._id, {
      title,
      description: `${title} — being sold at the end of term.`,
      price: 2100,
      category: 'vehicles',
      ...extra,
    });

  describe('ranking', () => {
    test('the row is ordered by meaning, not by what was posted last', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle');
      // Posted first, so "newest first" would put it last — it is the
      // closest match, so it has to come first.
      const closest = await addListing('Firefox bike, good condition');
      const looser = await addListing('Ladybird cycle, hostel pickup');

      await withVector(anchor, V_ANCHOR);
      await withVector(closest, V_095);
      await withVector(looser, V_085);

      const { titles, source } = await getRow(anchor._id);

      assert.equal(source, 'semantic');
      assert.deepEqual(titles, ['Firefox bike, good condition', 'Ladybird cycle, hostel pickup']);
    });

    test('a listing is never in its own row', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle');
      const other = await addListing('Firefox bike, good condition');
      await withVector(anchor, V_ANCHOR);
      await withVector(other, V_095);

      const { titles } = await getRow(anchor._id);

      assert.ok(!titles.includes('Hercules Roadeo gear cycle'));
    });

    test('something that is not the same kind of thing is left out', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle');
      const unrelated = await addListing('Nike running shoes UK 9');
      await withVector(anchor, V_ANCHOR);
      // 0.50 is well under the threshold: close enough to score, not close
      // enough to show.
      await withVector(unrelated, V_050);

      const { titles, source } = await getRow(anchor._id);

      // It falls back rather than showing a bad match — and the fallback is
      // category-based, which this listing does share, so it appears there.
      // The point is that retrieval did not claim it.
      assert.equal(source, 'category');
      assert.deepEqual(titles, ['Nike running shoes UK 9']);
    });
  });

  describe('the promises in the heading', () => {
    test('nothing dearer than the listing being looked at', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle', { price: 2100 });
      const dearer = await addListing('Firefox bike, nearly new', { price: 4200 });
      const cheaper = await addListing('Ladybird cycle, hostel pickup', { price: 900 });

      await withVector(anchor, V_ANCHOR);
      // The dearer one is the BETTER match, so only the price rule can keep
      // it out — if it leaks, it leaks into first place.
      await withVector(dearer, V_095);
      await withVector(cheaper, V_085);

      const { titles } = await getRow(anchor._id);

      assert.deepEqual(titles, ['Ladybird cycle, hostel pickup']);
    });

    test('a listing at the same price still counts as under it', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle', { price: 2100 });
      const same = await addListing('Firefox bike, good condition', { price: 2100 });
      await withVector(anchor, V_ANCHOR);
      await withVector(same, V_095);

      const { titles } = await getRow(anchor._id);

      assert.deepEqual(titles, ['Firefox bike, good condition']);
    });

    test('a hire is never offered as a substitute for a sale', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle', { price: 2100 });
      // ₹120/day is not "cheaper than" a ₹2,100 bike — it is a different
      // kind of number, and comparing them is the bug this rule exists for.
      const hire = await makeRental(seller._id, {
        title: 'Cycle for rent by the day',
        description: 'Cycle for rent by the day — being sold at the end of term.',
        category: 'vehicles',
        price: 120,
      });

      await withVector(anchor, V_ANCHOR);
      await withVector(hire, V_095);

      const { titles } = await getRow(anchor._id);

      assert.ok(!titles.includes('Cycle for rent by the day'));
    });

    test('and a sale is not offered as a substitute for a hire', async () => {
      const anchor = await makeRental(seller._id, {
        title: 'Cycle for rent by the day',
        description: 'Cycle for rent by the day — being sold at the end of term.',
        category: 'vehicles',
        price: 120,
      });
      const sale = await addListing('Hercules Roadeo gear cycle', { price: 100 });

      await withVector(anchor, V_ANCHOR);
      await withVector(sale, V_095);

      const { titles } = await getRow(anchor._id);

      assert.ok(!titles.includes('Hercules Roadeo gear cycle'));
    });
  });

  describe('keeping clear of the cross-sell', () => {
    test('what the strip above already suggests is not repeated below it', async () => {
      const anchor = await addListing('Redmi Note 12, 128GB', {
        price: 9000,
        category: 'electronics',
      });
      // A complement scores HIGHER against its anchor than a substitute
      // does — measured, 0.858 against 0.832 — so meaning alone cannot keep
      // it out of a substitutes row. Only knowing it is already on the page
      // can.
      const cover = await addListing('Redmi Note 12 back cover and screen guard', {
        price: 200,
        category: 'electronics',
      });
      const otherPhone = await addListing('iPhone 11 64GB', {
        price: 8000,
        category: 'electronics',
      });

      await withVector(anchor, V_ANCHOR);
      await withVector(cover, V_095);
      await withVector(otherPhone, V_085);

      await Listing.updateOne(
        { _id: anchor._id },
        {
          $set: {
            goesWith: {
              items: [{ listingId: cover._id, reason: 'Protects it' }],
              source: 'generated',
              at: new Date(),
            },
          },
        }
      );

      const { titles } = await getRow(anchor._id);

      assert.deepEqual(titles, ['iPhone 11 64GB'], 'the companion belongs to the strip, not the row');
    });
  });

  describe('when there is nothing to retrieve', () => {
    test('a listing posted before the job ran falls back to its category', async () => {
      // No vector on anything: exactly the state of a listing in its first
      // hour, and of the whole board with no provider configured.
      const anchor = await addListing('Hercules Roadeo gear cycle');
      await addListing('Firefox bike, good condition');

      const { titles, source } = await getRow(anchor._id);

      assert.equal(source, 'category');
      assert.deepEqual(titles, ['Firefox bike, good condition']);
    });

    test('the fallback still keeps the price promise', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle', { price: 2100 });
      await addListing('Firefox bike, nearly new', { price: 4200 });
      await addListing('Ladybird cycle, hostel pickup', { price: 900 });

      const { titles, source } = await getRow(anchor._id);

      // The heading says "under ₹2,100" whichever way the row was filled,
      // so the fallback has to honour it too.
      assert.equal(source, 'category');
      assert.deepEqual(titles, ['Ladybird cycle, hostel pickup']);
    });

    test('an edited listing is not matched on its old vector', async () => {
      const anchor = await addListing('Hercules Roadeo gear cycle');
      const other = await addListing('Firefox bike, good condition');
      await withVector(anchor, V_ANCHOR);
      await withVector(other, V_095);

      // The text moves, the cached vector does not — so it no longer
      // describes this listing and must be ignored until the job rewrites
      // it. Without the sourceHash check this would match on the old text
      // forever.
      await Listing.updateOne({ _id: anchor._id }, { $set: { title: 'Casio FX-991EX calculator' } });

      const { source } = await getRow(anchor._id);

      assert.equal(source, 'category', 'a stale vector must not be used');
    });

    test('a listing that does not exist is a 404, not an empty row', async () => {
      const res = await client().get('/listings/64b7f9c2e1a2b3c4d5e6f7a8/similar');

      assert.equal(res.status, 404);
    });
  });
});
