// A ban has to actually take someone off the page.
//
// It used to set `isBlocked` and nothing else: the suspended seller's
// listings stayed in browse, their community posts stayed up, their profile
// was still browsable and buyers could open threads that would never be
// answered. Every surface below is one that was leaking, so this file is
// the regression net for the whole feature.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeUser, makeSignedInUser, signIn, PASSWORD } = require('../helpers/factory');
const { makeListing } = require('../helpers/factory');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const ids = (res) => res.body.data.listings.map((l) => l._id);

describe('what a suspension hides', () => {
  let seller;
  let listing;
  let event;
  let moderator;
  let shopper;

  before(async () => {
    await clearDb();
    seller = await makeUser({ name: 'Suspended Seller' });
    listing = await makeListing(seller._id, { title: 'A bike that should vanish' });
    event = await Event.create({
      title: 'An event that should vanish',
      organizerId: seller._id,
      date: new Date(Date.now() + 7 * 86400000),
    });
    moderator = (await makeSignedInUser({ role: 'moderator' })).api;
    shopper = await makeSignedInUser();
  });

  test('before the ban, everything of theirs is reachable', async () => {
    assert.ok(ids(await client().get('/listings')).includes(String(listing._id)));
    assert.equal((await client().get(`/listings/${listing._id}`)).status, 200);
    assert.equal((await client().get(`/users/${seller._id}`)).status, 200);
    assert.equal((await client().get(`/users/${seller._id}/listings`)).status, 200);

    const events = await client().get('/events');
    assert.ok(events.body.data.events.some((e) => String(e._id) === String(event._id)));
  });

  test('a moderator can ban, and the reason is recorded', async () => {
    const res = await moderator.patch(`/admin/users/${seller._id}/ban`, {
      reason: 'Selling things that are not theirs',
    });

    assert.equal(res.status, 200);
    const stored = await User.findById(seller._id);
    assert.equal(stored.isBlocked, true);
    assert.equal(stored.banReason, 'Selling things that are not theirs');
  });

  test('their listings leave browse', async () => {
    assert.equal(ids(await client().get('/listings')).includes(String(listing._id)), false);
  });

  // Hiding it from the grid while still serving the direct link would only
  // move the problem — every listing card is a shareable URL.
  test('the direct link is a 404, not just hidden from the grid', async () => {
    assert.equal((await client().get(`/listings/${listing._id}`)).status, 404);
  });

  test('their public profile and seller page are 404', async () => {
    // 404 rather than 403: whether the account exists is nobody's business
    // either.
    assert.equal((await client().get(`/users/${seller._id}`)).status, 404);
    assert.equal((await client().get(`/users/${seller._id}/listings`)).status, 404);
  });

  test('their community posts come down too', async () => {
    const events = await client().get('/events');

    assert.equal(events.body.data.events.some((e) => String(e._id) === String(event._id)), false);
  });

  test('nobody can open a thread with them', async () => {
    const res = await shopper.api.post('/chat/conversations', { listingId: listing._id });

    // A message into a void: they cannot reply while the suspension stands.
    assert.equal(res.status, 404);
  });

  test('unbanning puts it all back and clears the reason', async () => {
    assert.equal((await moderator.patch(`/admin/users/${seller._id}/unban`)).status, 200);

    const stored = await User.findById(seller._id);
    assert.equal(stored.isBlocked, false);
    // A stale explanation must not resurface against the next ban.
    assert.ok(!stored.banReason);

    assert.ok(ids(await client().get('/listings')).includes(String(listing._id)));
    assert.equal((await client().get(`/users/${seller._id}`)).status, 200);
  });
});

describe('what a suspended person sees', () => {
  let user;
  let api;

  before(async () => {
    await clearDb();
    user = await makeUser({ banReason: 'Kept missing meetups' });
    api = await signIn(user);
  });

  // Before this, someone blocked while signed in just watched the app break
  // page by page — every authenticated request 403s with no explanation.
  test('a session already open is tagged ACCOUNT_BLOCKED on its next request', async () => {
    assert.equal((await api.get('/users/me')).status, 200);

    await User.updateOne({ _id: user._id }, { isBlocked: true });

    const res = await api.get('/users/me');
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_BLOCKED');
  });

  test('signing in returns the same tag, with the reason', async () => {
    const res = await client().post('/auth/login', {
      collegeEmail: user.collegeEmail,
      password: PASSWORD,
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_BLOCKED');
    assert.equal(res.body.details.reason, 'Kept missing meetups');
  });

  // The client branches on the code, not the status: a 403 from a
  // moderator-only route is an ordinary "not for you" and must never sign
  // anybody out.
  test('an ordinary 403 carries no code', async () => {
    const student = await makeSignedInUser();
    const res = await student.api.get('/admin/stats');

    assert.equal(res.status, 403);
    assert.equal(res.body.code ?? null, null);
  });
});

describe('who may ban', () => {
  let target;

  before(async () => {
    await clearDb();
    target = await makeUser();
  });

  test('a student cannot block another student', async () => {
    const student = await makeSignedInUser();
    const res = await student.api.post(`/users/${target._id}/block`);

    assert.equal(res.status, 403);
    assert.equal((await User.findById(target._id)).isBlocked, false);
  });

  test('a moderator can', async () => {
    const moderator = await makeSignedInUser({ role: 'moderator' });
    const res = await moderator.api.post(`/users/${target._id}/block`);

    assert.equal(res.status, 200);
    assert.equal((await User.findById(target._id)).isBlocked, true);
  });

  // Banning is recoverable; deleting is not. A moderator gets the first and
  // not the second.
  test('a moderator cannot delete an account', async () => {
    const moderator = await makeSignedInUser({ role: 'moderator' });
    const res = await moderator.api.delete(`/admin/users/${target._id}`);

    assert.equal(res.status, 403);
    assert.ok(await User.findById(target._id));
  });
});
