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
const { startApi, stopApi } = require('../helpers/api');
const { makeUser, makeListing, makeRental, makeSignedInUser } = require('../helpers/factory');
const { findMatches, activeName } = require('../../src/matchers');
const { runWantedMatches } = require('../../src/services/wantedMatch.service');
const LookingFor = require('../../src/models/LookingFor');
const Notification = require('../../src/models/Notification');

before(async () => {
  await startDb();
  await startApi();
});

const { after } = require('node:test');
after(async () => {
  await stopApi();
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

// Buying and renting are different questions about different listings, and
// before `LookingFor.listingType` existed the board could only ask one of
// them. A live post read "cycle", ₹100, "for one hour" — somebody wanting to
// borrow — and it was scored against ₹4,200 sale prices. Every test here
// would have passed before the field was added, which is the point of them.
describe('buying is not renting', () => {
  let student;
  let seller;

  beforeEach(async () => {
    await clearDb();
    student = await makeUser();
    seller = await makeUser();
  });

  test('a want to rent is not answered by the same thing for sale', async () => {
    await makeListing(seller._id, { title: 'Hercules gear cycle', price: 4200, status: 'active' });
    const wanted = await makeWanted(student._id, {
      title: 'need a cycle',
      listingType: 'rent',
      rentPeriod: 'day',
      maxBudget: 100,
    });

    assert.equal((await findMatches(wanted)).length, 0);
  });

  test('and a want to buy is not answered by a hire', async () => {
    await makeRental(seller._id, { title: 'Hercules gear cycle', price: 80, status: 'active' });
    const wanted = await makeWanted(student._id, { title: 'need a cycle', maxBudget: 5000 });

    assert.equal((await findMatches(wanted)).length, 0);
  });

  test('a want to rent finds the hire', async () => {
    const hire = await makeRental(seller._id, {
      title: 'Hercules gear cycle',
      price: 80,
      rentPeriod: 'day',
      status: 'active',
    });
    const wanted = await makeWanted(student._id, {
      title: 'need a cycle',
      listingType: 'rent',
      rentPeriod: 'day',
      maxBudget: 100,
    });

    const matches = await findMatches(wanted);
    assert.equal(matches.length, 1);
    assert.equal(String(matches[0].listing._id), String(hire._id));
  });

  // The second half of the same bug. A rent listing's price is a rate, so
  // `price <= maxBudget` compares two different units — ₹150 a day against
  // ₹900 a week says "too expensive" about something that is cheaper.
  test('a daily budget is compared against a weekly rate properly', async () => {
    const cheaper = await makeRental(seller._id, {
      title: 'Avon cycle to hire',
      rentPeriod: 'week',
      price: 900, // ₹128 a day
      status: 'active',
    });
    await makeRental(seller._id, {
      title: 'Firefox cycle to hire',
      rentPeriod: 'week',
      price: 1400, // ₹200 a day
      status: 'active',
    });
    const wanted = await makeWanted(student._id, {
      title: 'need a cycle',
      listingType: 'rent',
      rentPeriod: 'day',
      maxBudget: 150,
    });

    const matches = await findMatches(wanted);
    assert.equal(matches.length, 1, 'the weekly rate that works out cheaper per day');
    assert.equal(String(matches[0].listing._id), String(cheaper._id));
  });

  test('a rental want that never said per what still filters by type', async () => {
    const hire = await makeRental(seller._id, {
      title: 'Hercules gear cycle',
      price: 2500,
      rentPeriod: 'month',
      status: 'active',
    });
    await makeListing(seller._id, { title: 'Avon cycle', price: 50, status: 'active' });

    // ₹100 with no period. Its unit is unknown and a wrong guess is out by a
    // factor of thirty, so the budget is dropped rather than applied — but a
    // sale at ₹50 is still the wrong question and stays out.
    const wanted = await makeWanted(student._id, {
      title: 'need a cycle',
      listingType: 'rent',
      maxBudget: 100,
    });

    const matches = await findMatches(wanted);
    assert.equal(matches.length, 1);
    assert.equal(String(matches[0].listing._id), String(hire._id));
  });

  // Posts written before the field existed, and anything read with .lean()
  // (where Mongoose skips defaults), must behave exactly as they did.
  test('a post with no type at all is read as wanting to buy', async () => {
    const forSale = await makeListing(seller._id, {
      title: 'Hercules gear cycle',
      status: 'active',
    });
    await makeRental(seller._id, { title: 'Avon cycle to hire', status: 'active' });

    const wanted = await makeWanted(student._id, { title: 'need a cycle' });
    await LookingFor.updateOne({ _id: wanted._id }, { $unset: { listingType: '' } });
    const old = await LookingFor.findById(wanted._id).lean();
    assert.equal(old.listingType, undefined, 'the field really is absent');

    const matches = await findMatches(old);
    assert.equal(matches.length, 1);
    assert.equal(String(matches[0].listing._id), String(forSale._id));
  });
});

// The route grew `upload.array('images', 3)` so a want can carry a reference
// photo, and multer sits in front of the validator. That is the kind of
// change that breaks a caller nobody was thinking about — the "nobody is
// selling the thing that goes with this" button on a listing page posts here
// as plain JSON, with no files at all.
//
// A multipart request is deliberately NOT covered: multer's storage engine
// is Cloudinary, so a real upload would leave this process and hit the
// network. What is testable here is that adding it did not break anything.
describe('posting a want over HTTP', () => {
  let api;

  beforeEach(async () => {
    await clearDb();
    ({ api } = await makeSignedInUser());
  });

  test('a JSON post still works with an upload handler in front of it', async () => {
    const res = await api.post('/lookingfor', {
      title: 'need a drafter',
      description: 'To go with Engineering Drawing, first year.',
      category: 'stationery',
    });

    assert.equal(res.status, 201, res.body?.message);
    assert.equal(res.body.data.post.listingType, 'sale');
    assert.deepEqual(res.body.data.post.images, []);
  });

  test('and a rental want keeps its period', async () => {
    const res = await api.post('/lookingfor', {
      title: 'need a cycle',
      listingType: 'rent',
      rentPeriod: 'day',
      maxBudget: 100,
    });

    assert.equal(res.status, 201, res.body?.message);
    assert.equal(res.body.data.post.rentPeriod, 'day');
  });

  // The only way a photo gets onto a want is multer having uploaded one.
  test('a client cannot name its own photos', async () => {
    const res = await api.post('/lookingfor', {
      title: 'need a cycle',
      images: ['https://example.com/not-mine.jpg'],
    });

    assert.equal(res.status, 201, res.body?.message);
    assert.deepEqual(res.body.data.post.images, []);
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
