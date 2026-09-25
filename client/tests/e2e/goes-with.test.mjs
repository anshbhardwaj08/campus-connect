// The cross-sell strip, and the nudge that points at it.
//
// "Goes with this" sits below the photo, the description and the seller
// panel, so on a phone it is a long way down a page somebody opened to look
// at one thing. The cue exists to say it is there. All of its behaviour is
// timing and scroll position — the kind that breaks without anything
// throwing — so it is worth driving in a real browser.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startStack,
  stopStack,
  openTab,
  makeUser,
  makeListing,
  waitForText,
  db,
  oid,
} from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };

// The hourly job writes this; the page only ever reads it. Writing it
// directly is what the page would find on a board the job has been over.
const cache = async (listingId, items) =>
  db()
    .collection('listings')
    .updateOne(
      { _id: oid(listingId) },
      { $set: { goesWith: { items, source: 'generated', at: new Date() } } }
    );

const cueVisible = (tab) =>
  tab.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') || '').includes('go with this')
    );
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom <= window.innerHeight + 1 && getComputedStyle(el).opacity !== '0';
  });

test('a listing offers what goes with it, and says so', async (t) => {
  const seller = await makeUser({ name: 'Cross Seller' });

  const phone = await makeListing(seller._id, {
    title: 'Redmi Note 12, 128GB',
    description: 'Two years old, battery still fine.',
    price: 8000,
    status: 'active',
  });
  const cover = await makeListing(seller._id, {
    title: 'Silicone back cover for Redmi Note 12',
    description: 'Clear, barely used.',
    price: 150,
    status: 'active',
  });

  await cache(phone._id, [{ listingId: cover._id, reason: 'Keeps it from cracking.' }]);

  const tab = await openTab();
  await tab.setViewport(PHONE);

  await t.test('the strip shows the real listing and the reason for it', async () => {
    await tab.go(`/listings/${phone._id}`);

    // The suggestions are a SECOND round trip — the query only starts once
    // the listing itself has loaded — so it can land after the page has gone
    // quiet. Asserting straight after go() is a race that passes locally and
    // fails on a slower machine.
    await waitForText(tab, 'Goes with this');

    assert.equal(await tab.has('Silicone back cover for Redmi Note 12'), true);
    assert.equal(await tab.has('Keeps it from cracking.'), true);
  });

  await t.test('it starts below the fold, which is the problem', async () => {
    const offscreen = await tab.evaluate(() => {
      const heading = [...document.querySelectorAll('h2')].find((h) =>
        h.textContent.includes('Goes with this')
      );
      return heading.getBoundingClientRect().top > window.innerHeight;
    });

    assert.equal(offscreen, true, 'if this is on screen the cue is pointless and must not appear');
  });

  await t.test('so a cue rises from the bottom naming it', async () => {
    await tab.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some((b) =>
          (b.getAttribute('aria-label') || '').includes('go with this')
        ),
      { timeout: 10000 }
    );

    assert.equal(await cueVisible(tab), true);
    assert.equal(await tab.has('Silicone back cover for Redmi Note 12'), true);
  });

  await t.test('tapping it takes you there, and the cue leaves', async () => {
    await tab.click('button[aria-label*="go with this"]');

    await tab.waitForFunction(
      () => {
        const heading = [...document.querySelectorAll('h2')].find((h) =>
          h.textContent.includes('Goes with this')
        );
        return heading && heading.getBoundingClientRect().top < window.innerHeight;
      },
      { timeout: 10000 }
    );

    // It has done its job; nothing should be left covering the page.
    await tab.waitForFunction(
      () => {
        const el = [...document.querySelectorAll('button')].find((b) =>
          (b.getAttribute('aria-label') || '').includes('go with this')
        );
        return !el || getComputedStyle(el).opacity === '0';
      },
      { timeout: 10000 }
    );
  });

  await t.test('nothing went wrong along the way', () => {
    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
    assert.equal(tab.failures.length, 0, `API: ${tab.failures.join(' | ')}`);
  });

  await tab.close_();
});

test('the cue stays away when there is nothing to point at', async (t) => {
  const seller = await makeUser({ name: 'Quiet Seller' });
  const lonely = await makeListing(seller._id, {
    title: 'Nike running shoes, size 9',
    description: 'Worn a handful of times.',
    status: 'active',
  });

  const tab = await openTab();
  await tab.setViewport(PHONE);

  await t.test('no suggestions, no strip and no bar', async () => {
    await tab.go(`/listings/${lonely._id}`);
    // Long enough that the cue's own delay would have elapsed.
    await new Promise((r) => setTimeout(r, 2500));

    assert.equal(await cueVisible(tab), false);
    assert.equal(await tab.has('Goes with this'), false);
  });

  // A tall window puts the strip on screen already, so pointing at it would
  // be noise.
  await t.test('and stays away when the section is already visible', async () => {
    const other = await makeListing(seller._id, { title: 'Cycle lock with keys', status: 'active' });
    await cache(lonely._id, [{ listingId: other._id, reason: 'Fine on a gym bag too.' }]);

    await tab.setViewport({ width: 1400, height: 2200 });
    await tab.go(`/listings/${lonely._id}`);
    await new Promise((r) => setTimeout(r, 2500));

    assert.equal(await tab.has('Goes with this'), true, 'the strip itself still shows');
    assert.equal(await cueVisible(tab), false, 'but nothing needs pointing at');
  });

  await t.test('nothing went wrong along the way', () => {
    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
    assert.equal(tab.failures.length, 0, `API: ${tab.failures.join(' | ')}`);
  });

  await tab.close_();
});
