// Browse, and the rules about who may change a listing.
//
// The filter worth guarding most is sale-versus-rent: every listing created
// before renting existed has no `listingType` at all, so "to buy" has to
// match the absence of the field as well as the value.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeSignedInUser, makeListing, makeRental } = require('../helpers/factory');
const Listing = require('../../src/models/Listing');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const titles = (res) => res.body.data.listings.map((l) => l.title);

describe('browse', () => {
  let seller;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
    await makeListing(seller.user._id, { title: 'A sale listing', price: 400 });
    await makeRental(seller.user._id, { title: 'A rental listing', price: 120 });
    await makeListing(seller.user._id, { title: 'A sold listing', status: 'sold' });
    await makeListing(seller.user._id, { title: 'A pending listing', status: 'pending' });
    // What a listing looked like before renting existed: no listingType at
    // all. Written straight to the collection so the model default cannot
    // quietly fill it in.
    await Listing.collection.insertOne({
      title: 'A listing from before renting',
      description: 'Posted before the field existed.',
      price: 300,
      category: 'books',
      condition: 'used',
      status: 'active',
      sellerId: seller.user._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  test('only active listings are on the page', async () => {
    const found = titles(await client().get('/listings'));

    assert.equal(found.includes('A sold listing'), false);
    assert.equal(found.includes('A pending listing'), false);
    assert.equal(found.length, 3);
  });

  test('to rent returns rentals only', async () => {
    const found = titles(await client().get('/listings?listingType=rent'));

    assert.deepEqual(found, ['A rental listing']);
  });

  // The one that breaks silently: asking for sales has to match `$ne: rent`
  // rather than `= sale`, or every listing that predates the feature
  // disappears from the default view.
  test('to buy includes listings that predate the field', async () => {
    const found = titles(await client().get('/listings?listingType=sale'));

    assert.equal(found.length, 2);
    assert.ok(found.includes('A listing from before renting'));
    assert.equal(found.includes('A rental listing'), false);
  });

  test('a search matches mid-word, not just whole words', async () => {
    // Deliberately a regex and not the model's $text index: the UI searches
    // as you type, and $text would return nothing for "rent" until the word
    // was finished.
    const found = titles(await client().get('/listings?q=renta'));

    assert.deepEqual(found, ['A rental listing']);
  });

  test('regex characters in the search box are matched literally', async () => {
    const res = await client().get('/listings?q=*(');

    // An unescaped "*(" is an invalid regex and used to throw a 500.
    assert.equal(res.status, 200);
    assert.equal(res.body.data.listings.length, 0);
  });

  test('sorting by price runs both ways', async () => {
    const up = await client().get('/listings?sort=price-asc');
    const down = await client().get('/listings?sort=price-desc');

    assert.deepEqual(
      up.body.data.listings.map((l) => l.price),
      [120, 300, 400]
    );
    assert.deepEqual(
      down.body.data.listings.map((l) => l.price),
      [400, 300, 120]
    );
  });

  test('the seller is populated but not the whole user document', async () => {
    const [first] = (await client().get('/listings')).body.data.listings;

    assert.ok(first.sellerId.name);
    assert.equal(first.sellerId.collegeEmail, undefined);
    assert.equal(first.sellerId.phone, undefined);
    assert.equal(first.sellerId.passwordHash, undefined);
  });
});

describe('posting a listing', () => {
  let seller;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
  });

  const body = (overrides = {}) => ({
    title: 'A desk lamp',
    description: 'Works fine, moving out of the hostel.',
    price: 300,
    category: 'furniture',
    condition: 'used',
    ...overrides,
  });

  test('the seller is the caller and the listing goes live', async () => {
    const res = await seller.api.post('/listings', body());

    assert.equal(res.status, 201);
    const listing = await Listing.findById(res.body.data.listing._id);
    assert.equal(String(listing.sellerId), String(seller.user._id));
    assert.equal(listing.status, 'active');
    assert.equal(listing.scamScore, 0);
  });

  test('a listing full of pressure language still clears the queue on its own', async () => {
    // Pinned because PendingListings was built against seeded data: without
    // a category average the heuristic tops out at 55, under the 70 that
    // sends a listing to a moderator. Change the heuristic and this is what
    // tells you the queue behaviour moved.
    const res = await seller.api.post('/listings', body({
      title: 'Urgent, leaving today',
      description: 'Cash only, no questions, act now.',
    }));

    const listing = await Listing.findById(res.body.data.listing._id);
    assert.equal(listing.scamScore, 45);
    assert.equal(listing.status, 'active');
  });

  test('signing in is required', async () => {
    assert.equal((await client().post('/listings', body())).status, 401);
  });
});

describe('changing a listing', () => {
  let seller;
  let stranger;
  let listing;
  let rental;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
    stranger = await makeSignedInUser();
    listing = await makeListing(seller.user._id, { title: 'Mine to edit' });
    rental = await makeRental(seller.user._id, { rentPeriod: 'week', securityDeposit: 800 });
  });

  test('a stranger cannot edit it', async () => {
    const res = await stranger.api.patch(`/listings/${listing._id}`, {
      listingType: 'sale',
      title: 'Renamed by somebody else',
    });

    assert.equal(res.status, 403);
    assert.equal((await Listing.findById(listing._id)).title, 'Mine to edit');
  });

  test('a stranger cannot delete it', async () => {
    assert.equal((await stranger.api.delete(`/listings/${listing._id}`)).status, 403);
    assert.ok(await Listing.findById(listing._id));
  });

  // Without listingType on the edit, changing the title strips a rental's
  // period and deposit and silently turns a hire into a sale.
  test('an edit that omits the kind is refused outright', async () => {
    const res = await seller.api.patch(`/listings/${rental._id}`, { title: 'Just a new title' });

    assert.equal(res.status, 400);
    const unchanged = await Listing.findById(rental._id);
    assert.equal(unchanged.rentPeriod, 'week');
    assert.equal(unchanged.securityDeposit, 800);
  });

  test('an edit that restates the kind keeps the rental fields', async () => {
    const res = await seller.api.patch(`/listings/${rental._id}`, {
      listingType: 'rent',
      rentPeriod: 'week',
      securityDeposit: 800,
      title: 'Now with a better title',
    });

    assert.equal(res.status, 200);
    const updated = await Listing.findById(rental._id);
    assert.equal(updated.title, 'Now with a better title');
    assert.equal(updated.rentPeriod, 'week');
  });

  test('the owner can relist something that came back', async () => {
    await Listing.updateOne({ _id: rental._id }, { status: 'rented' });

    const res = await seller.api.patch(`/listings/${rental._id}/relist`);

    assert.equal(res.status, 200);
    assert.equal((await Listing.findById(rental._id)).status, 'active');
  });
});
