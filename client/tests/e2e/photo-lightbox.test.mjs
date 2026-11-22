// Opening a photo full size, from a card and from a listing page.
//
// Worth driving in a real browser for one reason above the others: making
// this work meant turning the listing card from a single big <a> into a
// panel with a stretched title link and a real <button> on top of it,
// because a <button> inside an <a> is invalid HTML. That refactor can break
// in a way nothing throws about — the card silently stops being clickable,
// or the expand button navigates instead of opening — and only a browser
// that actually clicks at a coordinate can tell the difference.
//
// `navigation.test.mjs` already proves every page is reachable by clicking.
// This proves the two controls that now overlap each other do the two
// different things they are supposed to.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startStack,
  stopStack,
  openTab,
  makeUser,
  makeListing,
  tap,
  waitForDialog,
  waitForText,
  db,
} from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };

// A real 2x2 PNG as a data URL. No network, no Cloudinary, no fixture file —
// and the browser treats it as an ordinary image, which is all the lightbox
// cares about.
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/AwMDAxMDAwAAABscA/0YqUJoAAAAASUVORK5CYII=';
const PIXEL_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAE0lEQVR42mP8z8DAwMjAwMAAAAcHAP9kKxwiAAAAAElFTkSuQmCC';

const lightboxOpen = (tab) =>
  tab.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return Boolean(d && d.querySelector('img'));
  });

test('a card photo opens full size, and the card still opens the listing', async () => {
  const seller = await makeUser({ name: 'Seller' });
  const listing = await makeListing(seller._id, {
    title: 'Hercules Roadeo gear cycle',
    images: [PIXEL],
  });

  const tab = await openTab();

  try {
    await tab.go('/browse');
    await waitForText(tab, 'Hercules Roadeo gear cycle');

    // The expand control, pressed at its centre — `tap` refuses to click
    // until a tap there would actually land on it, which is the whole
    // point: if the stretched link were on top, this would time out.
    await tap(tab, 'button[aria-label^="View photo of Hercules"]');
    await waitForDialog(tab);
    assert.equal(await lightboxOpen(tab), true, 'the photo should have opened');

    // It must not have navigated. Opening a photo is not opening a listing.
    assert.ok(
      tab.url().endsWith('/browse'),
      `expected to still be on /browse, was ${tab.url()}`
    );

    await tab.keyboard.press('Escape');
    await tab.waitForFunction(() => !document.querySelector('[role="dialog"]'), {
      timeout: 10000,
    });

    // And now the other half: the card itself still works.
    await tap(tab, `a[href="/listings/${listing._id}"]`);
    await tab.waitForFunction(
      (id) => location.pathname === `/listings/${id}`,
      { timeout: 20000 },
      String(listing._id)
    );

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
    assert.equal(tab.failures.length, 0, `API: ${tab.failures.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});

test('the arrows step through a listing with more than one photo', async () => {
  const seller = await makeUser({ name: 'Seller' });
  const listing = await makeListing(seller._id, {
    title: 'Firefox single-speed cycle',
    images: [PIXEL, PIXEL_2],
  });

  const tab = await openTab();

  try {
    await tab.go(`/listings/${listing._id}`);
    await waitForText(tab, 'Firefox single-speed cycle');

    await tap(tab, 'button[aria-label^="View photo of Firefox"]');
    await waitForDialog(tab);

    // The counter is the only thing on screen that says which photo this
    // is, so it is the thing worth asserting on.
    await waitForText(tab, '1 / 2');
    await tap(tab, 'button[aria-label="Next photo"]');
    await waitForText(tab, '2 / 2');

    // Wraps rather than dead-ending — at the last photo, "next" doing
    // nothing reads as broken.
    await tap(tab, 'button[aria-label="Next photo"]');
    await waitForText(tab, '1 / 2');

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});

test('no expand control where there is no photograph', async () => {
  const seller = await makeUser({ name: 'Seller' });
  await makeListing(seller._id, { title: 'Cengel Thermodynamics', images: [] });

  const tab = await openTab();

  try {
    await tab.go('/browse');
    await waitForText(tab, 'Cengel Thermodynamics');

    // An expand button over the placeholder icon would promise a photo that
    // does not exist.
    //
    // Scoped to THIS card, not counted across the page: the earlier tests in
    // this file leave their own photographed listings on the board, and a
    // page-wide count would pass or fail depending on what ran before it.
    const controls = await tab.evaluate((title) => {
      const card = [...document.querySelectorAll('.panel')].find((p) =>
        p.textContent.includes(title)
      );
      if (!card) return -1;
      return [...card.querySelectorAll('button')].filter((b) =>
        (b.getAttribute('aria-label') || '').startsWith('View photo')
      ).length;
    }, 'Cengel Thermodynamics');

    assert.notEqual(controls, -1, 'the card itself should be on the page');
    assert.equal(controls, 0);
  } finally {
    await tab.close_();
  }
});

test('a found item opens its photo too — that photo is the evidence', async () => {
  const finder = await makeUser({ name: 'Finder' });
  await db()
    .collection('lostfounds')
    .insertOne({
      type: 'found',
      title: 'Black leather wallet',
      description: 'Left on a bench outside the library.',
      location: 'Library lawn',
      images: [PIXEL],
      date: new Date(),
      userId: finder._id,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const tab = await openTab();
  await tab.setViewport(PHONE);

  try {
    await tab.go('/lost-found');
    await waitForText(tab, 'Black leather wallet');

    await tap(tab, 'button[aria-label^="View photo of Black leather wallet"]');
    await waitForDialog(tab);
    assert.equal(await lightboxOpen(tab), true);

    assert.equal(tab.errors.length, 0, `console: ${tab.errors.join(' | ')}`);
  } finally {
    await tab.close_();
  }
});
