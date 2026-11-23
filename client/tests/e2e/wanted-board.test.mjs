// The wanted board, now that a want can say whether it wants to buy or to
// borrow and can carry a photograph.
//
// Driven in a real browser for one reason: the risk in this change is not
// arithmetic, it is a misread. A want showing a photo of the thing somebody
// wants looks exactly like a listing of the thing they have, and the two
// invite opposite actions. What stops that is three bits of text rendered in
// the right corners of the card — WANTED, TO RENT and "up to" — and no unit
// test can tell you they are actually on screen.
//
// The photo control is the same one Browse and Lost & Found use, so it also
// re-checks that it stays pressable on a card it has never been on before.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startStack,
  stopStack,
  openTab,
  makeUser,
  signIn,
  press,
  tap,
  waitForDialog,
  waitForText,
  db,
} from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

// A real 2x2 PNG as a data URL — no network, no Cloudinary, and the browser
// treats it as any other image.
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/AwMDAxMDAwAAABscA/0YqUJoAAAAASUVORK5CYII=';

const makeWant = async (userId, overrides = {}) => {
  const { insertedId } = await db()
    .collection('lookingfors')
    .insertOne({
      userId,
      title: 'Drafter, full set',
      description: 'Any condition, as long as the compass holds.',
      category: 'stationery',
      listingType: 'sale',
      status: 'open',
      images: [],
      expiresAt: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  return insertedId;
};

// The panel that holds a given want, as text — so an assertion is about one
// card rather than whatever else is on the board.
//
// First match wins, and tests in a file share the board: **every test here
// needs its own title.** Two tests using the same one read each other's card
// and the failure blames the wrong thing.
const cardText = (tab, title) =>
  tab.evaluate((needle) => {
    const card = [...document.querySelectorAll('.panel')].find((p) =>
      p.textContent.includes(needle)
    );
    return card ? card.textContent : null;
  }, title);

test('a rental want says so, and says what its budget is per', async () => {
  const student = await makeUser({ name: 'Asker' });
  await makeWant(student._id, {
    title: 'Drafter for one afternoon',
    listingType: 'rent',
    rentPeriod: 'day',
    maxBudget: 100,
  });

  const tab = await openTab();

  try {
    await tab.go('/looking-for');
    await waitForText(tab, 'Drafter for one afternoon');

    const text = await cardText(tab, 'Drafter for one afternoon');

    // The stamp that stops the card being read as a listing.
    assert.match(text, /Wanted/i, 'every want is stamped WANTED');
    assert.match(text, /To rent/i, 'and a rental want says which question it asked');
    // "₹100" alone in that corner reads as an asking price.
    assert.match(text, /up to/i, 'the budget is qualified, not stamped like a price');
    assert.match(text, /100/, 'the budget itself');
    assert.match(text, /\/\s*DAY/i, 'a rate is meaningless without its period');

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
    assert.equal(tab.failures.length, 0, `API: ${tab.failures.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});

test('a want to buy carries no rental wording', async () => {
  const student = await makeUser({ name: 'Buyer' });
  await makeWant(student._id, { title: 'Cengel Thermodynamics, fifth edition', maxBudget: 600 });

  const tab = await openTab();

  try {
    await tab.go('/looking-for');
    await waitForText(tab, 'Cengel Thermodynamics, fifth edition');

    const text = await cardText(tab, 'Cengel Thermodynamics, fifth edition');

    assert.match(text, /Wanted/i);
    assert.doesNotMatch(text, /To rent/i, 'nothing about renting on a purchase');
    // A period on a purchase would be the bug this came from, upside down.
    assert.doesNotMatch(text, /\/\s*(DAY|WEEK|MONTH)/i);
    assert.match(text, /up to/i);

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});

test("a want's reference photo opens full size", async () => {
  const student = await makeUser({ name: 'Asker' });
  await makeWant(student._id, {
    title: 'Hercules Roadeo, gear cycle',
    images: [PIXEL],
    maxBudget: 4000,
  });

  const tab = await openTab();

  try {
    await tab.go('/looking-for');
    await waitForText(tab, 'Hercules Roadeo, gear cycle');

    // `tap` refuses to click until a tap at that point would actually land
    // on this button, so a stamp or a slab sitting over it fails here.
    await tap(tab, 'button[aria-label^="View photo of Hercules"]');
    await waitForDialog(tab);

    const shown = await tab.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return Boolean(d && d.querySelector('img'));
    });
    assert.equal(shown, true, 'the photo should have opened');

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});

test('no expand control on a want with no photograph', async () => {
  const student = await makeUser({ name: 'Asker' });
  await makeWant(student._id, { title: 'Casio fx-991, any condition' });

  const tab = await openTab();

  try {
    await tab.go('/looking-for');
    await waitForText(tab, 'Casio fx-991, any condition');

    // Scoped to this card: the earlier tests leave photographed wants on the
    // board, and a page-wide count would pass or fail on what ran before it.
    const controls = await tab.evaluate((needle) => {
      const card = [...document.querySelectorAll('.panel')].find((p) =>
        p.textContent.includes(needle)
      );
      if (!card) return -1;
      return [...card.querySelectorAll('button')].filter((b) =>
        (b.getAttribute('aria-label') || '').startsWith('View photo')
      ).length;
    }, 'Casio fx-991, any condition');

    assert.notEqual(controls, -1, 'the card itself should be on the page');
    assert.equal(controls, 0);
  } finally {
    await tab.close_();
  }
});

// The form itself, posted for real. Worth its own test because the request
// changed shape: a want used to go up as JSON and now goes as FormData, so
// that a photo can ride along. Everything above seeds the database directly
// and would pass even if submitting were broken.
test('a student can post a rental want through the form', async () => {
  const student = await makeUser({ name: 'Renter' });

  const tab = await openTab();

  try {
    await signIn(tab, student);
    await tab.go('/looking-for');

    await press(tab, 'Post a want');
    await waitForDialog(tab);

    // Buy is the default, so choosing rent is what has to actually take —
    // and it is the answer that decides which listings can ever match.
    await press(tab, 'I want to rent');

    await tab.type('input[name="title"]', 'Drafter for Thursday submission');
    await tab.type('textarea[name="description"]', 'Just for the Thursday submission.');
    await tab.type('input[name="maxBudget"]', '60');
    await tab.select('select[name="rentPeriod"]', 'week');

    await press(tab, 'Post it');

    await waitForText(tab, 'Drafter for Thursday submission');

    const text = await cardText(tab, 'Drafter for Thursday submission');
    assert.match(text, /To rent/i, 'the choice survived the round trip');
    assert.match(text, /\/\s*WEEK/i, 'and so did the period');

    // What the server actually stored, not just what the card drew.
    const stored = await db()
      .collection('lookingfors')
      .findOne({ title: 'Drafter for Thursday submission' });
    assert.equal(stored.listingType, 'rent');
    assert.equal(stored.rentPeriod, 'week');
    assert.equal(stored.maxBudget, 60);

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
    assert.equal(tab.failures.length, 0, `API: ${tab.failures.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});

// The board asks two questions, so it has to be able to show one of them.
// Somebody with a cycle to hire out is looking for the people asking to
// borrow one, not the dozen asking to buy.
test('the board can be narrowed to the people who want to rent', async () => {
  const student = await makeUser({ name: 'Asker' });
  await makeWant(student._id, { title: 'Table lamp to keep' });
  await makeWant(student._id, {
    title: 'Table lamp for exam week',
    listingType: 'rent',
    rentPeriod: 'week',
  });

  const tab = await openTab();

  try {
    await tab.go('/looking-for');
    await waitForText(tab, 'Table lamp to keep');
    await waitForText(tab, 'Table lamp for exam week');

    await press(tab, 'To rent');
    await tab.waitForFunction(
      () => !document.body.textContent.includes('Table lamp to keep'),
      { timeout: 20000 }
    );
    assert.match(await tab.evaluate(() => document.body.textContent), /Table lamp for exam week/);

    // And back the other way, which is where a post written before the
    // field existed would go missing if the query were a plain equality
    // check — the earlier tests leave several of those on the board.
    await press(tab, 'To buy');
    await tab.waitForFunction(
      () => !document.body.textContent.includes('Table lamp for exam week'),
      { timeout: 20000 }
    );
    assert.match(await tab.evaluate(() => document.body.textContent), /Table lamp to keep/);

    // "Everything" clears both filters, which is what it already meant.
    await press(tab, 'Everything');
    await waitForText(tab, 'Table lamp for exam week');

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
    assert.equal(tab.failures.length, 0, `API: ${tab.failures.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});
