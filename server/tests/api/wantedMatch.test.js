// The wanted board answering itself.
//
// Before this, a LookingFor post was written and never read again — the
// model carries an index commented "for matching listings" that nothing
// used. These cover the two halves: which listings answer a post
// (matchers/), and what the student is actually told (the service).

require('../helpers/env');

const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { makeUser, makeListing } = require('../helpers/factory');
const { findMatches, activeName } = require('../../src/matchers');
const { runWantedMatches } = require('../../src/services/wantedMatch.service');
const LookingFor = require('../../src/models/LookingFor');
const Notification = require('../../src/models/Notification');

before(async () => {
  await startDb();
});

const { after } = require('node:test');
after(async () => {
  await stopDb();
});

const makeWanted = (userId, overrides = {}) =>
  LookingFor.create({
    userId,
    title: 'need a cycle',
    status: 'open',
    ...overrides,
  });

describe('which listings answer a wanted post', () => {
  let student;
  let seller;

  beforeEach(async () => {
    await clearDb();
    student = await makeUser();
    seller = await makeUser();
  });

  // The whole point. Not one word in common.
  test('finds the listing that shares no words with the request', async () => {
    const listing = await makeListing(seller._id, {
      title: 'Hercules Roadeo 26in gear bike',
      description: 'Ridden for two semesters, tyres new.',
      status: 'active',
    });
    const wanted = await makeWanted(student._id, { title: 'need a cycle for campus' });

    const matches = await findMatches(wanted);

    assert.equal(matches.length, 1);
    assert.equal(String(matches[0].listing._id), String(listing._id));
    assert.ok(matches[0].score > 0, 'a match carries a score');
    assert.deepEqual(matches[0].shared, ['cycle'], 'and says what it matched on');
  });

  test('ignores a listing that is about something else', async () => {
    await makeListing(seller._id, { title: 'Revolving study chair', status: 'active' });
    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await findMatches(wanted)).length, 0);
  });

  test('never offers somebody their own listing', async () => {
    await makeListing(student._id, { title: 'Hercules gear cycle', status: 'active' });
    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await findMatches(wanted)).length, 0);
  });

  test('only looks at listings that are actually up', async () => {
    await makeListing(seller._id, { title: 'Hercules gear cycle', status: 'sold' });
    await makeListing(seller._id, { title: 'Avon cycle', status: 'pending' });
    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await findMatches(wanted)).length, 0);
  });

  test('a budget is a limit, not a hint', async () => {
    await makeListing(seller._id, { title: 'Firefox cycle', price: 9000, status: 'active' });
    const affordable = await makeListing(seller._id, {
      title: 'Avon cycle',
      price: 2000,
      status: 'active',
    });
    const wanted = await makeWanted(student._id, { title: 'need a cycle', maxBudget: 3000 });

    const matches = await findMatches(wanted);
    assert.equal(matches.length, 1);
    assert.equal(String(matches[0].listing._id), String(affordable._id));
  });

  // The live board has a wanted post for a "calculator" filed under `books`,
  // while any calculator listing would sit in electronics or stationery.
  // Filtering on category would throw that match away.
  test('a miscategorised post still matches', async () => {
    await makeListing(seller._id, {
      title: 'Casio fx-991 scientific',
      category: 'electronics',
      status: 'active',
    });
    const wanted = await makeWanted(student._id, { title: 'calculator', category: 'books' });

    assert.equal((await findMatches(wanted)).length, 1);
  });

  test('but the same category ranks higher', async () => {
    await makeListing(seller._id, {
      title: 'Casio fx-991 calculator',
      category: 'electronics',
      status: 'active',
    });
    await makeListing(seller._id, {
      title: 'Casio calculator, working',
      category: 'stationery',
      status: 'active',
    });
    const wanted = await makeWanted(student._id, { title: 'calculator', category: 'stationery' });

    const matches = await findMatches(wanted);
    assert.equal(matches.length, 2);
    assert.equal(matches[0].listing.category, 'stationery', 'best first');
    assert.ok(matches[0].score > matches[1].score);
  });

  test('a post that asks for nothing matches nothing', async () => {
    await makeListing(seller._id, { title: 'HP Laptop', status: 'active' });
    const wanted = await makeWanted(student._id, { title: 'dbjs' });

    assert.equal((await findMatches(wanted)).length, 0);
  });

  test('only listings newer than `since` when one is given', async () => {
    const old = await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    await new Promise((r) => setTimeout(r, 20));
    const cutoff = new Date();
    await new Promise((r) => setTimeout(r, 20));
    const fresh = await makeListing(seller._id, { title: 'Hercules cycle', status: 'active' });

    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await findMatches(wanted)).length, 2, 'no cutoff means the whole board');

    const since = await findMatches(wanted, { since: cutoff });
    assert.equal(since.length, 1);
    assert.equal(String(since[0].listing._id), String(fresh._id));
    assert.notEqual(String(since[0].listing._id), String(old._id));
  });

  test('returns at most what it was asked for', async () => {
    for (let i = 0; i < 4; i += 1) {
      await makeListing(seller._id, { title: `Avon cycle number ${i}`, status: 'active' });
    }
    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await findMatches(wanted, { limit: 2 })).length, 2);
  });
});

describe('what the student is told', () => {
  let student;
  let seller;

  beforeEach(async () => {
    await clearDb();
    student = await makeUser();
    seller = await makeUser();
  });

  test('a notification that links straight to the listing', async () => {
    const listing = await makeListing(seller._id, {
      title: 'Hercules Roadeo gear bike',
      status: 'active',
    });
    await makeWanted(student._id, { title: 'need a cycle' });

    const result = await runWantedMatches();
    assert.deepEqual(
      { checked: result.checked, notified: result.notified },
      { checked: 1, notified: 1 }
    );

    const note = await Notification.findOne({ userId: student._id });
    assert.equal(note.type, 'wanted_match');
    assert.equal(note.link, `/listings/${listing._id}`);
    assert.match(note.message, /Hercules/);
  });

  // The listing was already up when the post was written — which is the
  // normal case, because nobody browses before asking.
  test('the first run looks at the whole board, not just what is new', async () => {
    await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    await new Promise((r) => setTimeout(r, 20));
    await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await runWantedMatches()).notified, 1);
  });

  test('and does not say the same thing twice', async () => {
    await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await runWantedMatches()).notified, 1);
    assert.equal((await runWantedMatches()).notified, 0, 'nothing new since last time');
    assert.equal(await Notification.countDocuments({ userId: student._id }), 1);
  });

  test('but does speak up when something new arrives', async () => {
    await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    await runWantedMatches();
    await new Promise((r) => setTimeout(r, 20));
    await makeListing(seller._id, { title: 'Hercules gear cycle', status: 'active' });

    assert.equal((await runWantedMatches()).notified, 1);
    assert.equal(await Notification.countDocuments({ userId: student._id }), 2);
    assert.ok((await LookingFor.findById(wanted._id)).lastNotifiedAt, 'the mark moved');
  });

  test('a post nobody can answer is left alone', async () => {
    await makeListing(seller._id, { title: 'Revolving study chair', status: 'active' });
    const wanted = await makeWanted(student._id, { title: 'need a cycle' });

    assert.equal((await runWantedMatches()).notified, 0);
    assert.equal(await Notification.countDocuments({}), 0);
    assert.equal(
      (await LookingFor.findById(wanted._id)).lastNotifiedAt,
      undefined,
      'the mark must not move on a miss, or the post would skip past listings it never saw'
    );
  });

  test('a post that is done or expired is not matched', async () => {
    await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    await makeWanted(student._id, { title: 'need a cycle', status: 'fulfilled' });
    await makeWanted(student._id, {
      title: 'need a cycle too',
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await runWantedMatches();
    assert.equal(result.checked, 0);
    assert.equal(await Notification.countDocuments({}), 0);
  });

  test('several matches are counted, and the best one is the link', async () => {
    await makeListing(seller._id, { title: 'Avon cycle', status: 'active' });
    const best = await makeListing(seller._id, {
      title: 'Hercules cycle',
      category: 'cycles',
      status: 'active',
    });
    await makeWanted(student._id, { title: 'need a cycle', category: 'cycles' });

    await runWantedMatches();

    const note = await Notification.findOne({ userId: student._id });
    assert.match(note.message, /2 listings/);
    assert.equal(note.link, `/listings/${best._id}`);
  });

  test('the run says which matcher produced it', async () => {
    assert.equal((await runWantedMatches()).matcher, activeName());
  });
});
