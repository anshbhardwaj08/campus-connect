// The handshake: price agreed -> seller shows a code -> buyer types it ->
// both confirm -> listing marked sold -> either side may review.
//
// Most of the assertions here are guards rather than happy paths. Every
// deal endpoint once had no ownership check at all: any signed-in student
// could regenerate a stranger's verify code, mark their deal verified or
// open a dispute on it, and POST /deals took buyerId from the request body.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeSignedInUser, makeListing, makeConversation } = require('../helpers/factory');
const Deal = require('../../src/models/Deal');
const Listing = require('../../src/models/Listing');
const User = require('../../src/models/User');
const Review = require('../../src/models/Review');
const Notification = require('../../src/models/Notification');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

describe('opening a deal from a conversation', () => {
  let seller;
  let buyer;
  let outsider;
  let listing;
  let conversation;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser({ name: 'Seller' });
    buyer = await makeSignedInUser({ name: 'Buyer' });
    outsider = await makeSignedInUser({ name: 'Outsider' });
    listing = await makeListing(seller.user._id, { price: 900 });
    conversation = await makeConversation(listing, buyer.user._id);
  });

  // POST /deals makes the CALLER the buyer, but the person accepting an
  // offer is the seller — reusing it would file the seller as the buyer.
  test('only the seller may accept', async () => {
    const asBuyer = await buyer.api.post('/deals/from-conversation', {
      conversationId: conversation._id,
      finalPrice: 800,
    });

    assert.equal(asBuyer.status, 403);
    assert.equal(await Deal.countDocuments(), 0);
  });

  test('someone outside the conversation cannot accept', async () => {
    const res = await outsider.api.post('/deals/from-conversation', {
      conversationId: conversation._id,
      finalPrice: 800,
    });

    assert.equal(res.status, 403);
    assert.equal(await Deal.countDocuments(), 0);
  });

  test('the seller accepting opens one deal with both sides derived', async () => {
    const res = await seller.api.post('/deals/from-conversation', {
      conversationId: conversation._id,
      finalPrice: 800,
      meetupLocation: 'Main gate',
    });

    assert.equal(res.status, 201);
    const deal = await Deal.findById(res.body.data.deal._id);
    assert.equal(String(deal.sellerId), String(seller.user._id));
    assert.equal(String(deal.buyerId), String(buyer.user._id));
    assert.equal(deal.finalPrice, 800);
    assert.equal(deal.status, 'pending');
  });

  test('the buyer is told it is their turn', async () => {
    const notes = await Notification.find({ userId: buyer.user._id, type: 'deal' });

    assert.equal(notes.length, 1);
    assert.match(notes[0].title, /accepted your offer/);
    assert.match(notes[0].link, /^\/chat\?conversation=/);
  });

  // The endpoint is deliberately idempotent — a seller pressing accept
  // twice must land on the same deal, and must not tell the buyer twice.
  test('accepting again returns the same deal and does not notify again', async () => {
    const before = await Deal.countDocuments();

    const res = await seller.api.post('/deals/from-conversation', {
      conversationId: conversation._id,
      finalPrice: 800,
    });

    assert.equal(res.status, 201);
    assert.equal(await Deal.countDocuments(), before);
    assert.equal(await Notification.countDocuments({ userId: buyer.user._id, type: 'deal' }), 1);
  });
});

describe('the code and the confirmations', () => {
  let seller;
  let buyer;
  let outsider;
  let listing;
  let deal;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
    buyer = await makeSignedInUser();
    outsider = await makeSignedInUser();
    listing = await makeListing(seller.user._id, { price: 900 });
    const conversation = await makeConversation(listing, buyer.user._id);
    const res = await seller.api.post('/deals/from-conversation', {
      conversationId: conversation._id,
      finalPrice: 800,
    });
    deal = res.body.data.deal;
  });

  test('an outsider is refused by every deal endpoint', async () => {
    assert.equal((await outsider.api.post(`/deals/${deal._id}/generate-code`)).status, 403);
    assert.equal((await outsider.api.post(`/deals/${deal._id}/verify-code`, { code: 'ABC123' })).status, 403);
    assert.equal((await outsider.api.patch(`/deals/${deal._id}/dispute`)).status, 403);
  });

  test('the buyer cannot mint the code', async () => {
    const res = await buyer.api.post(`/deals/${deal._id}/generate-code`);

    assert.equal(res.status, 403);
  });

  test('the seller can, and it changes the code', async () => {
    const previous = (await Deal.findById(deal._id)).verifyCode;
    const res = await seller.api.post(`/deals/${deal._id}/generate-code`);

    assert.equal(res.status, 200);
    assert.notEqual(res.body.data.verifyCode, previous);
    assert.equal(res.body.data.verifyCode, (await Deal.findById(deal._id)).verifyCode);
  });

  test('a wrong code is refused and the deal stays pending', async () => {
    const res = await buyer.api.post(`/deals/${deal._id}/verify-code`, { code: 'NOPE00' });

    assert.equal(res.status, 400);
    assert.equal((await Deal.findById(deal._id)).status, 'pending');
  });

  test('the right code marks it verified and tells the other side', async () => {
    const code = (await Deal.findById(deal._id)).verifyCode;
    const res = await buyer.api.post(`/deals/${deal._id}/verify-code`, { code });

    assert.equal(res.status, 200);
    assert.equal((await Deal.findById(deal._id)).status, 'verified');
    assert.ok(
      await Notification.findOne({ userId: seller.user._id, title: /verified the code/ })
    );
  });

  test('one confirmation leaves the deal open and nudges the other side', async () => {
    const res = await buyer.api.patch(`/deals/${deal._id}/buyer-confirm`);

    assert.equal(res.status, 200);
    const stored = await Deal.findById(deal._id);
    assert.equal(stored.buyerConfirmed, true);
    assert.equal(stored.status, 'verified');
    assert.ok(await Notification.findOne({ userId: seller.user._id, title: /confirmed the deal/ }));
  });

  test('a buyer cannot confirm the seller half', async () => {
    const res = await buyer.api.patch(`/deals/${deal._id}/seller-confirm`);

    // Scoped by the query itself: the update only matches a deal whose
    // sellerId is the caller, so this is not their deal to find.
    assert.equal(res.status, 404);
    assert.equal((await Deal.findById(deal._id)).sellerConfirmed, false);
  });

  test('both confirmations close it, mark the listing sold and move the counters', async () => {
    const res = await seller.api.patch(`/deals/${deal._id}/seller-confirm`);
    assert.equal(res.status, 200);

    const stored = await Deal.findById(deal._id);
    assert.equal(stored.status, 'completed');
    assert.equal((await Listing.findById(listing._id)).status, 'sold');
    assert.equal((await User.findById(seller.user._id)).dealsCompleted, 1);
    assert.equal((await User.findById(buyer.user._id)).dealsCompleted, 1);

    // A sale is finished at the handover, so both are pointed at a review.
    assert.ok(await Notification.findOne({ userId: buyer.user._id, title: 'Deal closed' }));
    assert.ok(await Notification.findOne({ userId: seller.user._id, title: 'Deal closed' }));
  });
});

describe('POST /deals directly', () => {
  let buyer;
  let seller;
  let listing;

  before(async () => {
    await clearDb();
    buyer = await makeSignedInUser();
    seller = await makeSignedInUser();
    listing = await makeListing(seller.user._id);
  });

  // buyerId used to come off the request body, which let a caller open a
  // deal in someone else's name.
  test('the buyer is the caller, whatever the body says', async () => {
    const res = await buyer.api.post('/deals', {
      listingId: listing._id,
      finalPrice: 500,
      buyerId: seller.user._id,
    });

    assert.equal(res.status, 201);
    assert.equal(String((await Deal.findById(res.body.data.deal._id)).buyerId), String(buyer.user._id));
  });

  test('you cannot buy your own listing', async () => {
    const res = await seller.api.post('/deals', { listingId: listing._id, finalPrice: 500 });

    assert.equal(res.status, 400);
  });

  test('signing in is required', async () => {
    const res = await client().post('/deals', { listingId: listing._id, finalPrice: 500 });

    assert.equal(res.status, 401);
  });
});

describe('reviews come out of the deal', () => {
  let seller;
  let buyer;
  let outsider;
  let listing;
  let deal;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
    buyer = await makeSignedInUser();
    outsider = await makeSignedInUser();
    listing = await makeListing(seller.user._id);
    const conversation = await makeConversation(listing, buyer.user._id);
    deal = (
      await seller.api.post('/deals/from-conversation', {
        conversationId: conversation._id,
        finalPrice: 700,
      })
    ).body.data.deal;
  });

  test('a review is refused before the deal is closed', async () => {
    const res = await buyer.api.post('/reviews', { dealId: deal._id, rating: 5 });

    assert.equal(res.status, 400);
    assert.equal(await Review.countDocuments(), 0);
  });

  test('once closed, the reviewee and type are derived, not taken from the body', async () => {
    await Deal.updateOne({ _id: deal._id }, { status: 'completed' });

    const res = await buyer.api.post('/reviews', {
      dealId: deal._id,
      rating: 5,
      comment: 'Turned up on time',
      // All three are spoof attempts: a buyer reviewing themselves as the
      // seller would be a trust score written by its own subject.
      revieweeId: buyer.user._id,
      type: 'buyer',
      listingId: listing._id,
    });

    assert.equal(res.status, 201);
    const review = await Review.findById(res.body.data.review._id);
    assert.equal(String(review.revieweeId), String(seller.user._id));
    assert.equal(review.type, 'seller');
    assert.equal(String(review.listingId), String(listing._id));
  });

  test('the same person cannot review the same deal twice', async () => {
    const res = await buyer.api.post('/reviews', { dealId: deal._id, rating: 1 });

    assert.equal(res.status, 409);
    assert.equal(await Review.countDocuments(), 1);
  });

  test('someone who was not in the deal cannot review it', async () => {
    const res = await outsider.api.post('/reviews', { dealId: deal._id, rating: 1 });

    assert.equal(res.status, 403);
    assert.equal(await Review.countDocuments(), 1);
  });

  test('the other side reviews in the opposite direction', async () => {
    const res = await seller.api.post('/reviews', { dealId: deal._id, rating: 4 });

    assert.equal(res.status, 201);
    const review = await Review.findById(res.body.data.review._id);
    assert.equal(String(review.revieweeId), String(buyer.user._id));
    assert.equal(review.type, 'buyer');
  });

  // /reviews/mine is reviews WRITTEN BY the caller; /users/:id/reviews is
  // the opposite direction. The deals page needs this one to tell which
  // closed deals it has already had a say on.
  test('mine returns what I wrote, not what was written about me', async () => {
    const mine = await buyer.api.get('/reviews/mine');
    const aboutTheSeller = await client().get(`/reviews/user/${seller.user._id}`);

    assert.equal(mine.body.data.reviews.length, 1);
    assert.equal(String(mine.body.data.reviews[0].dealId), String(deal._id));
    assert.equal(aboutTheSeller.body.data.reviews.length, 1);
  });
});
