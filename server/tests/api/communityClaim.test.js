// Settling a community post from inside its chat thread.
//
// Before this, a ride's seat count never changed and a found wallet stayed on
// the board until its owner remembered to close it. The two sides agree in
// the chat, so the handshake lives there: one asks, the owner confirms, the
// post updates itself.
//
// What matters most here is what is REFUSED — nobody may close someone
// else's post, hand themselves a seat, or take the last seat twice.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi } = require('../helpers/api');
const { makeSignedInUser } = require('../helpers/factory');
const Carpool = require('../../src/models/Carpool');
const LostFound = require('../../src/models/LostFound');
const LookingFor = require('../../src/models/LookingFor');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const makeRide = (userId, seatsAvailable = 3) =>
  Carpool.create({
    userId,
    from: 'Campus gate',
    to: 'Railway station',
    departureDate: new Date(Date.now() + 86400000),
    seatsAvailable,
    contactInfo: '99999 00000',
  });

// Opens the thread the way the client does, then asks.
const askOn = async (asker, subjectType, subjectId, body = {}) => {
  const started = await asker.api.post('/chat/conversations', { subjectType, subjectId });
  const conversationId = started.body.data.conversation._id;
  const res = await asker.api.post(`/chat/conversations/${conversationId}/claim`, body);
  return { conversationId, res };
};

describe('a ride', () => {
  let driver;
  let rider;
  let ride;

  before(async () => {
    await clearDb();
    driver = await makeSignedInUser();
    rider = await makeSignedInUser();
    ride = await makeRide(driver.user._id, 3);
  });

  test('a rider asks for two seats and the driver confirms: the ride loses two', async () => {
    const { res } = await askOn(rider, 'carpool', ride._id, { seats: 2 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.message.claim.seats, 2);

    // Nothing has changed yet — asking is not taking.
    assert.equal((await Carpool.findById(ride._id)).seatsAvailable, 3);

    const decided = await driver.api.patch(`/chat/claims/${res.body.data.message._id}`, {
      action: 'confirm',
    });
    assert.equal(decided.status, 200);

    const after = await Carpool.findById(ride._id);
    assert.equal(after.seatsAvailable, 1);
    assert.equal(after.status, 'open');
  });

  test('the rider cannot confirm their own request', async () => {
    const other = await makeSignedInUser();
    const { res } = await askOn(other, 'carpool', ride._id, { seats: 1 });

    const decided = await other.api.patch(`/chat/claims/${res.body.data.message._id}`, {
      action: 'confirm',
    });

    assert.equal(decided.status, 403);
    assert.equal((await Carpool.findById(ride._id)).seatsAvailable, 1);
  });

  test('the last seat closes the ride', async () => {
    const lastRider = await makeSignedInUser();
    const { res } = await askOn(lastRider, 'carpool', ride._id, { seats: 1 });
    await driver.api.patch(`/chat/claims/${res.body.data.message._id}`, { action: 'confirm' });

    const after = await Carpool.findById(ride._id);
    assert.equal(after.seatsAvailable, 0);
    assert.equal(after.status, 'closed');
  });

  test('a closed ride takes no more requests', async () => {
    const late = await makeSignedInUser();
    const { res } = await askOn(late, 'carpool', ride._id, { seats: 1 });
    assert.equal(res.status, 409);
  });

  test('asking for more seats than the ride has is refused', async () => {
    const small = await makeRide(driver.user._id, 1);
    const hopeful = await makeSignedInUser();
    const { res } = await askOn(hopeful, 'carpool', small._id, { seats: 3 });
    assert.equal(res.status, 409);
  });

  test('asking for a nonsense number of seats is refused', async () => {
    const someRide = await makeRide(driver.user._id, 2);
    const hopeful = await makeSignedInUser();
    for (const seats of [0, -1, 2.5, 'two']) {
      const { res } = await askOn(hopeful, 'carpool', someRide._id, { seats });
      assert.equal(res.status, 400, `for ${seats}`);
    }
  });

  // Two riders, one seat, both confirmed in the same moment. The seat count
  // must not go negative, and only one of them can win.
  test('two confirmations racing for the last seat: one wins', async () => {
    const contested = await makeRide(driver.user._id, 1);
    const a = await makeSignedInUser();
    const b = await makeSignedInUser();
    const askA = await askOn(a, 'carpool', contested._id, { seats: 1 });
    const askB = await askOn(b, 'carpool', contested._id, { seats: 1 });

    const [resA, resB] = await Promise.all([
      driver.api.patch(`/chat/claims/${askA.res.body.data.message._id}`, { action: 'confirm' }),
      driver.api.patch(`/chat/claims/${askB.res.body.data.message._id}`, { action: 'confirm' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(statuses, [200, 409], 'exactly one confirmation should win');

    const after = await Carpool.findById(contested._id);
    assert.equal(after.seatsAvailable, 0);
    assert.equal(after.status, 'closed');
  });
});

describe('a lost & found post', () => {
  let owner;
  let finder;
  let item;

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser();
    finder = await makeSignedInUser();
    item = await LostFound.create({ userId: owner.user._id, type: 'lost', title: 'Blue water bottle' });
  });

  test('the finder says they have it and the owner confirms: the post closes', async () => {
    const { res } = await askOn(finder, 'lostfound', item._id);
    assert.equal(res.status, 201);
    assert.equal((await LostFound.findById(item._id)).status, 'open');

    const decided = await owner.api.patch(`/chat/claims/${res.body.data.message._id}`, {
      action: 'confirm',
    });

    assert.equal(decided.status, 200);
    assert.equal((await LostFound.findById(item._id)).status, 'resolved');
  });

  test('a second request on a closed post is refused', async () => {
    const someoneElse = await makeSignedInUser();
    const { res } = await askOn(someoneElse, 'lostfound', item._id);
    assert.equal(res.status, 409);
  });

  test('declining leaves the post up', async () => {
    const stillLost = await LostFound.create({
      userId: owner.user._id,
      type: 'lost',
      title: 'Grey hoodie',
    });
    const { res } = await askOn(finder, 'lostfound', stillLost._id);

    const decided = await owner.api.patch(`/chat/claims/${res.body.data.message._id}`, {
      action: 'decline',
    });

    assert.equal(decided.status, 200);
    assert.equal((await LostFound.findById(stillLost._id)).status, 'open');
    assert.equal(decided.body.data.message.claim.status, 'declined');
  });

  test('one open request per thread', async () => {
    const another = await LostFound.create({
      userId: owner.user._id,
      type: 'found',
      title: 'Set of keys',
    });
    const { conversationId, res } = await askOn(finder, 'lostfound', another._id);
    assert.equal(res.status, 201);

    const again = await finder.api.post(`/chat/conversations/${conversationId}/claim`, {});
    assert.equal(again.status, 409);
  });

  test('someone outside the thread cannot confirm it', async () => {
    const stranger = await makeSignedInUser();
    const open = await LostFound.create({ userId: owner.user._id, type: 'found', title: 'Umbrella' });
    const { res } = await askOn(finder, 'lostfound', open._id);

    const decided = await stranger.api.patch(`/chat/claims/${res.body.data.message._id}`, {
      action: 'confirm',
    });

    assert.equal(decided.status, 403);
    assert.equal((await LostFound.findById(open._id)).status, 'open');
  });
});

describe('a wanted post', () => {
  test('the owner confirms and the request is marked fulfilled', async () => {
    await clearDb();
    const asker = await makeSignedInUser();
    const helper = await makeSignedInUser();
    const want = await LookingFor.create({ userId: asker.user._id, title: 'Scientific calculator' });

    const { res } = await askOn(helper, 'lookingfor', want._id);
    const decided = await asker.api.patch(`/chat/claims/${res.body.data.message._id}`, {
      action: 'confirm',
    });

    assert.equal(decided.status, 200);
    assert.equal((await LookingFor.findById(want._id)).status, 'fulfilled');
  });
});

describe('threads that are not about a community post', () => {
  test('a listing thread has no claim: sales have their own handshake', async () => {
    await clearDb();
    const seller = await makeSignedInUser();
    const buyer = await makeSignedInUser();
    const { makeListing } = require('../helpers/factory');
    const listing = await makeListing(seller.user._id);

    const started = await buyer.api.post('/chat/conversations', { listingId: listing._id });
    const res = await buyer.api.post(
      `/chat/conversations/${started.body.data.conversation._id}/claim`,
      {}
    );

    assert.equal(res.status, 400);
  });
});
