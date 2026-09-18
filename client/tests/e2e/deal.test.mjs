// The whole product loop, driven by two people in two tabs:
//
//   seller posts -> buyer messages -> seller replies -> buyer offers ->
//   seller accepts -> the gate handshake (show code / enter code) ->
//   both confirm -> buyer reviews
//
// One test with one step per stage, not a test per stage: each stage needs
// the state the one before left behind, and a failure should name the stage
// it broke at rather than cascade into five unrelated-looking failures.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startStack,
  stopStack,
  openTab,
  makeUser,
  makeCategory,
  signIn,
  press,
  waitForText,
  waitForMessage,
  waitForDialog,
  db,
  oid,
} from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

test('a sale goes from posting to a review, through the real screens', async (t) => {
  await makeCategory('books', 'Books');
  const seller = await makeUser({ name: 'Asha Kapoor' });
  const buyer = await makeUser({ name: 'Ravi Mehta' });
  const title = 'Engineering Mechanics, Beer and Johnston';

  const sellerTab = await openTab();
  const buyerTab = await openTab();
  await signIn(sellerTab, seller);
  await signIn(buyerTab, buyer);

  let listingId;
  let code;

  await t.test('the seller posts a listing through the form', async () => {
    await sellerTab.go('/listings/new');
    await sellerTab.type('input[name="title"]', title);
    await sellerTab.type(
      'textarea[name="description"]',
      'Seventh edition. Some pencil in chapter four, otherwise clean.'
    );
    await sellerTab.select('select[name="category"]', 'books');
    await sellerTab.select('select[name="condition"]', 'used');
    await sellerTab.type('input[name="price"]', '450');
    await sellerTab.type('input[name="pickupLocation"]', 'Library gate');

    await Promise.all([
      sellerTab.waitForFunction(() => /^\/listings\/[a-f0-9]{24}$/.test(location.pathname), {
        timeout: 20000,
      }),
      press(sellerTab, 'Publish'),
    ]);
    listingId = new URL(sellerTab.url()).pathname.split('/').pop();

    await waitForText(sellerTab, title);
    const listing = await db().collection('listings').findOne({ title });
    assert.equal(String(listing._id), listingId);
    assert.equal(String(listing.sellerId), String(seller._id));
    assert.equal(listing.price, 450);
  });

  await t.test('the buyer messages the seller from the listing', async () => {
    await buyerTab.go(`/listings/${listingId}`);
    await Promise.all([
      buyerTab.waitForFunction(() => location.pathname === '/chat', { timeout: 20000 }),
      press(buyerTab, 'Message the seller'),
    ]);

    await buyerTab.locator('input[aria-label="Message"]').setTimeout(20000).fill('Is it still available?');
    await buyerTab.keyboard.press('Enter');
    await waitForMessage(buyerTab, 'Is it still available?');
  });

  await t.test('the seller sees it and replies, live', async () => {
    await sellerTab.go('/chat');
    await press(sellerTab, 'Ravi Mehta');
    await waitForMessage(sellerTab, 'Is it still available?');

    await sellerTab.locator('input[aria-label="Message"]').fill('Yes, still here.');
    await sellerTab.keyboard.press('Enter');

    // No reload on the buyer's side: this only arrives over the socket.
    await waitForMessage(buyerTab, 'Yes, still here.');
  });

  await t.test('the buyer offers and the seller accepts', async () => {
    await buyerTab.locator('button[aria-label="Make an offer"]').click();
    await buyerTab.locator('input[aria-label="Offer amount"]').fill('400');
    await press(buyerTab, 'Send offer');

    await press(sellerTab, 'Accept offer');
    await waitForText(sellerTab, 'Deal opened');

    const deal = await db().collection('deals').findOne({ listingId: oid(listingId) });
    assert.ok(deal, 'accepting should open a deal');
    assert.equal(deal.finalPrice, 400);
    assert.equal(String(deal.buyerId), String(buyer._id));
    assert.equal(deal.status, 'pending');
  });

  await t.test('the seller shows the code and the buyer enters it', async () => {
    await sellerTab.go('/deals');
    await press(sellerTab, 'Show code');
    await press(sellerTab, 'Generate the code');
    const shown = await sellerTab.waitForSelector('p.select-all', { timeout: 20000 });
    code = (await shown.evaluate((el) => el.textContent)).trim();
    assert.match(code, /^[A-Z0-9]{6}$/);
    await sellerTab.keyboard.press('Escape');

    await buyerTab.go('/deals');
    await press(buyerTab, 'Enter code');
    await waitForDialog(buyerTab);
    await buyerTab.locator('input[aria-label="Deal code"]').fill(code);
    await press(buyerTab, 'Check the code');
    await waitForText(buyerTab, 'Code checked at the gate');
  });

  await t.test('both confirm the handover and the listing is sold', async () => {
    await press(buyerTab, 'Confirm handover');
    await waitForText(buyerTab, 'Waiting on them');

    await sellerTab.go('/deals');
    await waitForText(sellerTab, 'They confirmed — your turn');
    await press(sellerTab, 'Confirm handover');
    await waitForText(sellerTab, 'Both sides confirmed');

    const deal = await db().collection('deals').findOne({ listingId: oid(listingId) });
    assert.equal(deal.status, 'completed');
    const listing = await db().collection('listings').findOne({ _id: oid(listingId) });
    assert.equal(listing.status, 'sold');
  });

  await t.test('the buyer reviews the seller', async () => {
    await buyerTab.go('/deals');
    await press(buyerTab, 'Review Asha');
    await waitForDialog(buyerTab);
    await buyerTab.locator('[aria-label="4 stars"]').click();
    await buyerTab.locator('textarea').fill('On time, book exactly as described.');
    await press(buyerTab, 'Post the review');
    await waitForText(buyerTab, 'You reviewed this one.');

    const review = await db().collection('reviews').findOne({ reviewerId: buyer._id });
    assert.ok(review, 'the review should be stored');
    assert.equal(String(review.revieweeId), String(seller._id));
    assert.equal(review.rating, 4);
  });

  await t.test('nothing went wrong along the way', () => {
    for (const [who, tab] of [
      ['seller', sellerTab],
      ['buyer', buyerTab],
    ]) {
      assert.equal(tab.errors.length, 0, `${who} console: ${tab.errors.join(' | ')}`);
      assert.equal(tab.failures.length, 0, `${who} API: ${tab.failures.join(' | ')}`);
    }
  });

  await sellerTab.close_();
  await buyerTab.close_();
});
