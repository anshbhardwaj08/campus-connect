// Renting, and the clock that came with it.
//
// Renting shipped with no notion of when anything was due back: both sides
// agreed "how long" in a chat message and nothing recorded it. The pieces
// that closed that — a length settled at accept, a due date set at the
// handover rather than at the agreement, one action that ends a hire, and a
// daily job that nudges once per milestone — are all load-bearing and all
// easy to break from a distance.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi } = require('../helpers/api');
const { makeSignedInUser, makeRental, makeListing, makeConversation } = require('../helpers/factory');
const { runRentalDueCheck } = require('../../src/services/rentalDue.service');
const Deal = require('../../src/models/Deal');
const Listing = require('../../src/models/Listing');
const Notification = require('../../src/models/Notification');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const DAY = 86400000;

// Walks a deal through the handshake to the point where the item is in the
// renter's hands and the clock is running.
const handOver = async (owner, renter, deal) => {
  const code = (await Deal.findById(deal._id)).verifyCode;
  await renter.api.post(`/deals/${deal._id}/verify-code`, { code });
  await renter.api.patch(`/deals/${deal._id}/buyer-confirm`);
  await owner.api.patch(`/deals/${deal._id}/seller-confirm`);
  return Deal.findById(deal._id);
};

describe('agreeing how long', () => {
  let owner;
  let renter;
  let listing;
  let conversation;

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser({ name: 'Owner' });
    renter = await makeSignedInUser({ name: 'Renter' });
    listing = await makeRental(owner.user._id, { price: 120, rentPeriod: 'day', securityDeposit: 1500 });
    conversation = await makeConversation(listing, renter.user._id);
  });

  // Without a length nothing downstream can say whether an item is late,
  // which was the entire gap renting opened up.
  test('a hire cannot be accepted without one', async () => {
    const res = await owner.api.post('/deals/from-conversation', {
      conversationId: conversation._id,
      finalPrice: 120,
    });

    assert.equal(res.status, 400);
    assert.equal(await Deal.countDocuments(), 0);
  });

  test('the length has to be a believable whole number of periods', async () => {
    for (const rentalPeriods of [0, -1, 53, 1.5, 'a while']) {
      const res = await owner.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 120,
        rentalPeriods,
      });
      assert.equal(res.status, 400, `accepted ${rentalPeriods}`);
    }
  });

  test('a sale is unaffected by any of that', async () => {
    const sale = await makeListing(owner.user._id);
    const saleThread = await makeConversation(sale, renter.user._id);

    const res = await owner.api.post('/deals/from-conversation', {
      conversationId: saleThread._id,
      finalPrice: 400,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.deal.rentalDays, undefined);
  });
});

describe('the length is counted in the listing period', () => {
  let owner;
  let renter;

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser();
    renter = await makeSignedInUser();
  });

  // "2" on a per-week listing is a fortnight — the owner answers in the
  // listing's own unit rather than doing the arithmetic themselves.
  for (const [rentPeriod, periods, expectedDays] of [
    ['day', 3, 3],
    ['week', 2, 14],
    ['month', 1, 30],
  ]) {
    test(`${periods} ${rentPeriod}(s) becomes ${expectedDays} days`, async () => {
      const listing = await makeRental(owner.user._id, { rentPeriod });
      const conversation = await makeConversation(listing, renter.user._id);

      const res = await owner.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 100,
        rentalPeriods: periods,
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.deal.rentalDays, expectedDays);
    });
  }
});

describe('the deposit is settled at accept', () => {
  let owner;
  let renter;
  let listing;
  let deal;

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser();
    renter = await makeSignedInUser();
    listing = await makeRental(owner.user._id, { securityDeposit: 1500 });
    const conversation = await makeConversation(listing, renter.user._id);
    deal = (
      await owner.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 120,
        rentalPeriods: 3,
      })
    ).body.data.deal;
  });

  test('the figure is copied onto the deal', async () => {
    assert.equal((await Deal.findById(deal._id)).securityDeposit, 1500);
  });

  // The owner can edit the listing mid-hire. What matters afterwards is the
  // figure the two of them agreed — same reasoning as finalPrice living on
  // the deal rather than being read back off the listing.
  test('editing the listing afterwards does not rewrite what was agreed', async () => {
    const res = await owner.api.patch(`/listings/${listing._id}`, {
      listingType: 'rent',
      rentPeriod: 'day',
      securityDeposit: 50,
    });

    assert.equal(res.status, 200);
    assert.equal((await Listing.findById(listing._id)).securityDeposit, 50);
    assert.equal((await Deal.findById(deal._id)).securityDeposit, 1500);
  });

  test('a rental with no deposit records zero rather than inventing one', async () => {
    const free = await makeRental(owner.user._id, { securityDeposit: 0 });
    const thread = await makeConversation(free, renter.user._id);

    const res = await owner.api.post('/deals/from-conversation', {
      conversationId: thread._id,
      finalPrice: 120,
      rentalPeriods: 1,
    });

    assert.equal(res.body.data.deal.securityDeposit, 0);
  });
});

describe('the clock starts at the handover', () => {
  let owner;
  let renter;
  let listing;
  let deal;

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser({ name: 'Owner' });
    renter = await makeSignedInUser({ name: 'Renter' });
    listing = await makeRental(owner.user._id, { rentPeriod: 'day', securityDeposit: 1500 });
    const conversation = await makeConversation(listing, renter.user._id);
    deal = (
      await owner.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 120,
        rentalPeriods: 3,
      })
    ).body.data.deal;
  });

  // The meetup can be days after the deal was struck, and the clock a
  // renter has in mind starts when the thing is in their hands.
  test('there is a length but no due date before they have met', async () => {
    const stored = await Deal.findById(deal._id);

    assert.equal(stored.rentalDays, 3);
    assert.equal(stored.dueAt, undefined);
  });

  test('both confirmations set the due date from that moment', async () => {
    const at = Date.now();
    const stored = await handOver(owner, renter, deal);

    assert.equal(stored.status, 'completed');
    const daysOut = (stored.dueAt.getTime() - at) / DAY;
    assert.ok(Math.abs(daysOut - 3) < 0.01, `due in ${daysOut} days`);
  });

  // A rental comes back. Marking it sold would take it off the page for
  // good, which is the one thing the owner did not agree to.
  test('the listing goes to rented, not sold', async () => {
    assert.equal((await Listing.findById(listing._id)).status, 'rented');
  });

  test('both sides are told the hire has started, from their own side', async () => {
    const toRenter = await Notification.findOne({ userId: renter.user._id, title: 'The hire has started' });
    const toOwner = await Notification.findOne({ userId: owner.user._id, title: 'The hire has started' });

    assert.ok(toRenter);
    assert.ok(toOwner);
    // A deposit is only meaningful as "yours, held by them" or the reverse.
    assert.match(toRenter.message, /holding your ₹1500 deposit/);
    assert.match(toOwner.message, /holding their ₹1500 deposit/);
  });
});

describe('ending a hire', () => {
  let owner;
  let renter;
  let listing;
  let deal;

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser({ name: 'Owner' });
    renter = await makeSignedInUser({ name: 'Renter' });
    listing = await makeRental(owner.user._id, { securityDeposit: 1500 });
    const conversation = await makeConversation(listing, renter.user._id);
    deal = (
      await owner.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 120,
        rentalPeriods: 3,
      })
    ).body.data.deal;
    await handOver(owner, renter, deal);
  });

  test('the renter cannot declare it returned', async () => {
    const res = await renter.api.patch(`/deals/${deal._id}/returned`);

    assert.equal(res.status, 403);
    assert.equal((await Deal.findById(deal._id)).returnedAt, undefined);
  });

  // One action, not three: done separately, the deal kept reading "out"
  // long after the owner had already relisted the thing.
  test('the owner can, and it stops the clock, relists and tells the renter', async () => {
    const res = await owner.api.patch(`/deals/${deal._id}/returned`);

    assert.equal(res.status, 200);
    assert.ok((await Deal.findById(deal._id)).returnedAt);
    assert.equal((await Listing.findById(listing._id)).status, 'active');

    const note = await Notification.findOne({
      userId: renter.user._id,
      title: 'Returned — that hire is settled',
    });
    assert.ok(note);
    assert.match(note.message, /₹1500 deposit back/);
  });

  test('a second return is refused', async () => {
    const res = await owner.api.patch(`/deals/${deal._id}/returned`);

    assert.equal(res.status, 400);
  });

  test('a sale cannot be marked returned', async () => {
    const sale = await makeListing(owner.user._id);
    const thread = await makeConversation(sale, renter.user._id);
    const saleDeal = (
      await owner.api.post('/deals/from-conversation', { conversationId: thread._id, finalPrice: 400 })
    ).body.data.deal;

    const res = await owner.api.patch(`/deals/${saleDeal._id}/returned`);

    assert.equal(res.status, 400);
  });

  // If the owner has since sold it, deleted it or hired it out again,
  // forcing it back to active would undo their decision.
  test('returning only reopens a listing still sitting at rented', async () => {
    const second = await makeRental(owner.user._id);
    const thread = await makeConversation(second, renter.user._id);
    const secondDeal = (
      await owner.api.post('/deals/from-conversation', {
        conversationId: thread._id,
        finalPrice: 120,
        rentalPeriods: 1,
      })
    ).body.data.deal;
    await handOver(owner, renter, secondDeal);

    await Listing.updateOne({ _id: second._id }, { status: 'sold' });
    assert.equal((await owner.api.patch(`/deals/${secondDeal._id}/returned`)).status, 200);

    assert.equal((await Listing.findById(second._id)).status, 'sold');
  });
});

describe('the daily due check', () => {
  let owner;
  let renter;
  let deal;

  const notesFor = (userId, pattern) =>
    Notification.countDocuments({ userId, title: pattern });

  before(async () => {
    await clearDb();
    owner = await makeSignedInUser({ name: 'Owner' });
    renter = await makeSignedInUser({ name: 'Renter' });
    const listing = await makeRental(owner.user._id, { title: 'A tripod' });
    const conversation = await makeConversation(listing, renter.user._id);
    deal = (
      await owner.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 120,
        rentalPeriods: 7,
      })
    ).body.data.deal;
    await handOver(owner, renter, deal);
    await Notification.deleteMany({}); // the handover notices are not what this is about
  });

  test('says nothing in the middle of a hire', async () => {
    const result = await runRentalDueCheck(new Date());

    assert.deepEqual({ dueSoon: result.dueSoon, overdue: result.overdue }, { dueSoon: 0, overdue: 0 });
    assert.equal(await Notification.countDocuments(), 0);
  });

  // The day before, only the renter is nudged: the owner has nothing to do
  // about a hire that is still running to plan.
  test('nudges the renter the day before, and nobody else', async () => {
    const dueAt = (await Deal.findById(deal._id)).dueAt;
    const result = await runRentalDueCheck(new Date(dueAt.getTime() - 12 * 3600000));

    assert.equal(result.dueSoon, 1);
    assert.equal(await notesFor(renter.user._id, /due back tomorrow/), 1);
    assert.equal(await Notification.countDocuments({ userId: owner.user._id }), 0);
  });

  // A reminder repeated every morning gets muted, and then the one that
  // matters is muted too.
  test('does not nudge again the next time it runs', async () => {
    const dueAt = (await Deal.findById(deal._id)).dueAt;
    const result = await runRentalDueCheck(new Date(dueAt.getTime() - 6 * 3600000));

    assert.equal(result.dueSoon, 0);
    assert.equal(await notesFor(renter.user._id, /due back tomorrow/), 1);
  });

  // Overdue tells both: the renter may simply have forgotten, and only the
  // owner can chase it or mark it back.
  test('once overdue it reaches both sides', async () => {
    const dueAt = (await Deal.findById(deal._id)).dueAt;
    const result = await runRentalDueCheck(new Date(dueAt.getTime() + 2 * DAY));

    assert.equal(result.overdue, 1);
    assert.equal(await notesFor(renter.user._id, /is overdue/), 1);
    assert.equal(await notesFor(owner.user._id, /has not come back/), 1);
    assert.ok(
      (await Notification.findOne({ userId: owner.user._id, title: /has not come back/ })).message.includes('2 days late')
    );
  });

  test('and does not repeat that either', async () => {
    const dueAt = (await Deal.findById(deal._id)).dueAt;
    const result = await runRentalDueCheck(new Date(dueAt.getTime() + 5 * DAY));

    assert.equal(result.overdue, 0);
    assert.equal(await notesFor(renter.user._id, /is overdue/), 1);
  });

  test('a hire that is back drops out of the check entirely', async () => {
    await owner.api.patch(`/deals/${deal._id}/returned`);

    const result = await runRentalDueCheck(new Date(Date.now() + 30 * DAY));

    assert.equal(result.checked, 0);
  });
});
