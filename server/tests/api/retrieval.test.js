// Retrieval in the two places it was just wired in: browse search and
// saved-search alerts.
//
// Both used to be word matching — a regex on browse, `$text` on saved
// searches — so neither could connect "bike" to a cycle, which is the one
// thing the campus vocabulary actually needs. These cover that it now can,
// and the rules about WHEN it is allowed to: never while somebody is
// typing, and never when the keywords already answered.
require('../helpers/env');

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeUser, makeListing } = require('../helpers/factory');

const Listing = require('../../src/models/Listing');
const SavedSearch = require('../../src/models/SavedSearch');
const Notification = require('../../src/models/Notification');
const retrieve = require('../../src/matchers/retrieve');
const { runSavedSearchAlerts } = require('../../src/services/savedSearch.service');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

// Retrieval is stubbed rather than run: a real embedding call needs a
// provider, a network and a bill, and none of that is what these assert.
// What matters is whether the callers ask for it at the right moments and
// do the right thing with the answer.
const realSearch = retrieve.semanticSearch;
const stubSearch = (resultsFor) => {
  const calls = [];
  retrieve.semanticSearch = async (query, options) => {
    calls.push({ query, options });
    return resultsFor(query, options);
  };
  return calls;
};

describe('retrieval', () => {
  let seller;

  beforeEach(async () => {
    await clearDb();
    retrieve.semanticSearch = realSearch;
    seller = await makeUser({ name: 'Seller' });
  });

  const addListing = (title, extra = {}) =>
    makeListing(seller._id, { title, description: 'A thing for sale', price: 2100, ...extra });

  describe('browse search', () => {
    test('keyword results still answer without any retrieval', async () => {
      await addListing('Hercules Roadeo 26in gear bike');
      const calls = stubSearch(() => []);

      const res = await client().get('/listings?q=Hercules');

      assert.equal(res.status, 200);
      assert.equal(res.body.data.listings.length, 1);
      assert.equal(calls.length, 0, 'the regex answered, so nothing should be retrieved');
    });

    test('typing never reaches retrieval, even when nothing matches', async () => {
      await addListing('Hercules Roadeo 26in gear bike');
      const calls = stubSearch(() => []);

      // No deep flag: this is what the debounce sends on every keystroke.
      const res = await client().get('/listings?q=cycle');

      assert.equal(res.status, 200);
      assert.equal(res.body.data.listings.length, 0);
      assert.equal(calls.length, 0, 'a keystroke must never cost a round trip');
    });

    test('an explicit search finds what the words could not', async () => {
      const bike = await addListing('Hercules Roadeo 26in gear bike');
      const calls = stubSearch(() => [{ listing: bike, score: 0.71 }]);

      const res = await client().get('/listings?q=cycle&deep=1');

      assert.equal(res.status, 200);
      assert.equal(calls.length, 1, 'retrieval should have been asked');
      const titles = res.body.data.listings.map((l) => l.title);
      assert.deepEqual(titles, ['Hercules Roadeo 26in gear bike']);
    });

    test('a listing the keywords already found is not returned twice', async () => {
      const bike = await addListing('Hercules Roadeo 26in gear bike');
      // Retrieval legitimately finds the same listing the regex did — one
      // hit is under the floor, so the second tier still runs.
      const calls = stubSearch(() => [{ listing: bike, score: 0.71 }]);

      const res = await client().get('/listings?q=Hercules&deep=1');

      assert.equal(calls.length, 1);
      assert.equal(res.body.data.listings.length, 1, 'the duplicate must be dropped');
    });

    test('the stated filters still apply to what retrieval returns', async () => {
      const bike = await addListing('Hercules Roadeo 26in gear bike', { price: 2100 });
      const calls = stubSearch(() => [{ listing: bike, score: 0.71 }]);

      await client().get('/listings?q=cycle&deep=1&maxPrice=500');

      // A price ceiling is a stated constraint, not a hint — it has to be
      // part of the candidate set, not applied after the fact.
      assert.equal(calls.length, 1);
      assert.ok(calls[0].options.filter.price, 'the price filter must reach retrieval');
      assert.equal(calls[0].options.filter.price.$lte, 500);
    });

    test('a provider outage degrades to the keyword results', async () => {
      await addListing('Hercules Roadeo 26in gear bike');
      // What semanticSearch does when there is no embedder: returns nothing.
      stubSearch(() => []);

      const res = await client().get('/listings?q=cycle&deep=1');

      assert.equal(res.status, 200, 'the page must still render');
      assert.deepEqual(res.body.data.listings, []);
    });
  });

  describe('saved-search alerts', () => {
    test('a saved "cycle" is told about a bike', async () => {
      const bike = await addListing('Hercules Roadeo 26in gear bike');
      const watcher = await makeUser({ name: 'Watcher' });
      await SavedSearch.create({
        userId: watcher._id,
        query: 'cycle',
        createdAt: new Date(Date.now() - 60_000),
      });

      stubSearch(() => [{ listing: bike, score: 0.71 }]);
      const result = await runSavedSearchAlerts();

      assert.equal(result.notified, 1);
      const note = await Notification.findOne({ userId: watcher._id });
      assert.ok(note, 'the watcher should have been notified');
      assert.match(note.message, /cycle/);
    });

    test('nothing retrieved means nothing sent', async () => {
      await addListing('Hercules Roadeo 26in gear bike');
      const watcher = await makeUser({ name: 'Quiet' });
      await SavedSearch.create({
        userId: watcher._id,
        query: 'microscope',
        createdAt: new Date(Date.now() - 60_000),
      });

      stubSearch(() => []);
      const result = await runSavedSearchAlerts();

      assert.equal(result.notified, 0);
      assert.equal(await Notification.countDocuments({ userId: watcher._id }), 0);
    });

  });
});
