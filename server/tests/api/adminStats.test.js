// The dashboard's figures.
//
// These are aggregations, which fail quietly: a wrong bucket or a dropped
// day still draws a chart, it just draws the wrong one. The three decisions
// worth holding still are that empty days come back as zeros, that days are
// bucketed in the campus timezone rather than UTC, and that a completed
// deal is dated by `updatedAt` because Deal has no `completedAt`.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeSignedInUser, makeListing } = require('../helpers/factory');
const Listing = require('../../src/models/Listing');
const Deal = require('../../src/models/Deal');
const Report = require('../../src/models/Report');
const Category = require('../../src/models/Category');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const TZ = 'Asia/Kolkata';
const DAY = 86400000;

// The same key the controller builds. Pinned deliberately: what is under
// test is the choice of timezone, not the formatting.
const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);

describe('who may see the figures', () => {
  before(clearDb);

  test('a signed-out request is 401', async () => {
    assert.equal((await client().get('/admin/stats')).status, 401);
  });

  test('a student is 403', async () => {
    const student = await makeSignedInUser();

    assert.equal((await student.api.get('/admin/stats')).status, 403);
    assert.equal((await student.api.get('/admin/stats/activity')).status, 403);
    assert.equal((await student.api.get('/admin/stats/categories')).status, 403);
  });

  test('a moderator may read all three', async () => {
    const moderator = await makeSignedInUser({ role: 'moderator' });

    assert.equal((await moderator.api.get('/admin/stats')).status, 200);
    assert.equal((await moderator.api.get('/admin/stats/activity')).status, 200);
    assert.equal((await moderator.api.get('/admin/stats/categories')).status, 200);
  });
});

describe('the headline counters', () => {
  let admin;

  before(async () => {
    await clearDb();
    admin = await makeSignedInUser({ role: 'admin' });
    const seller = await makeSignedInUser();
    await makeListing(seller.user._id, { status: 'active' });
    await makeListing(seller.user._id, { status: 'sold' });
    await makeListing(seller.user._id, { status: 'pending' });
    await Deal.create({
      listingId: (await Listing.findOne())._id,
      buyerId: admin.user._id,
      sellerId: seller.user._id,
      finalPrice: 100,
      verifyCode: 'ABC123',
      status: 'completed',
    });
    await Report.create({
      reporterId: admin.user._id,
      targetType: 'listing',
      targetId: (await Listing.findOne())._id,
      reason: 'Test',
      status: 'open',
    });
  });

  test('counts what is there, and separates active from total', async () => {
    const { data } = (await admin.api.get('/admin/stats')).body;

    assert.equal(data.totalUsers, 2);
    assert.equal(data.totalListings, 3);
    assert.equal(data.activeListings, 1);
    assert.equal(data.totalDeals, 1); // completed only
    assert.equal(data.openReports, 1);
  });
});

describe('the activity series', () => {
  let admin;
  let seller;

  before(async () => {
    await clearDb();
    admin = await makeSignedInUser({ role: 'admin' });
    seller = await makeSignedInUser();
  });

  test('defaults to thirty days and says which timezone it bucketed in', async () => {
    const { data } = (await admin.api.get('/admin/stats/activity')).body;

    assert.equal(data.days, 30);
    assert.equal(data.timezone, TZ);
    assert.equal(data.series.length, 30);
  });

  test('the range is clamped at both ends', async () => {
    const tooSmall = (await admin.api.get('/admin/stats/activity?days=1')).body.data;
    const tooBig = (await admin.api.get('/admin/stats/activity?days=500')).body.data;
    const nonsense = (await admin.api.get('/admin/stats/activity?days=bananas')).body.data;

    assert.equal(tooSmall.days, 7);
    assert.equal(tooBig.days, 90);
    assert.equal(nonsense.days, 30);
  });

  // A series that omits quiet days draws a straight line across them, which
  // reads as steady activity rather than as silence.
  test('every day in the window is present, including the empty ones', async () => {
    const { series } = (await admin.api.get('/admin/stats/activity?days=7')).body.data;

    assert.equal(series.length, 7);
    assert.equal(series[series.length - 1].date, dayKey(new Date()));

    series.forEach((day, i) => {
      assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
      for (const key of ['listings', 'deals', 'users', 'reports']) {
        assert.equal(typeof day[key], 'number', `${day.date}.${key}`);
      }
      if (i > 0) {
        const step = Date.parse(`${day.date}T00:00:00Z`) - Date.parse(`${series[i - 1].date}T00:00:00Z`);
        assert.equal(step, DAY, `gap before ${day.date}`);
      }
    });
  });

  test('a listing posted now lands in today', async () => {
    await makeListing(seller.user._id);

    const { series } = (await admin.api.get('/admin/stats/activity?days=7')).body.data;
    const today = series.find((d) => d.date === dayKey(new Date()));

    assert.equal(today.listings, 1);
  });

  // One campus, one timezone. Something posted at 1 a.m. belongs to that
  // morning — UTC bucketing would file everything before 5:30 a.m. under
  // the previous day and make "today" wrong every morning.
  test('an early-hours listing is filed under the campus day, not the UTC one', async () => {
    const yesterday = dayKey(new Date(Date.now() - DAY));
    const atOneAm = new Date(`${yesterday}T01:00:00+05:30`); // 19:30 UTC the day before

    const listing = await makeListing(seller.user._id);
    // Through the driver, not the model: mongoose strips createdAt out of
    // any update, so backdating one has to go round it.
    await Listing.collection.updateOne({ _id: listing._id }, { $set: { createdAt: atOneAm } });

    const { series } = (await admin.api.get('/admin/stats/activity?days=7')).body.data;
    const dayBefore = dayKey(new Date(Date.now() - 2 * DAY));

    assert.equal(series.find((d) => d.date === yesterday).listings, 1);
    assert.equal(series.find((d) => d.date === dayBefore).listings, 0);
  });

  // Deal has no completedAt: nothing mutates a deal once it is completed,
  // so updatedAt is the moment it closed.
  test('deals are counted on the day they closed, and only when completed', async () => {
    const listing = await Listing.findOne();
    const closedThreeDaysAgo = new Date(Date.now() - 3 * DAY);

    const done = await Deal.create({
      listingId: listing._id,
      buyerId: admin.user._id,
      sellerId: seller.user._id,
      finalPrice: 100,
      verifyCode: 'ABC123',
      status: 'completed',
    });
    await Deal.updateOne({ _id: done._id }, { updatedAt: closedThreeDaysAgo }, { timestamps: false });

    // Still running: must not appear anywhere in the series.
    await Deal.create({
      listingId: listing._id,
      buyerId: admin.user._id,
      sellerId: seller.user._id,
      finalPrice: 100,
      verifyCode: 'XYZ789',
      status: 'pending',
    });

    const { series } = (await admin.api.get('/admin/stats/activity?days=7')).body.data;

    assert.equal(series.find((d) => d.date === dayKey(closedThreeDaysAgo)).deals, 1);
    assert.equal(series.reduce((sum, d) => sum + d.deals, 0), 1);
  });

  test('anything older than the window is left out', async () => {
    const listing = await makeListing(seller.user._id);
    await Listing.collection.updateOne(
      { _id: listing._id },
      { $set: { createdAt: new Date(Date.now() - 40 * DAY) } }
    );

    const week = (await admin.api.get('/admin/stats/activity?days=7')).body.data.series;
    const quarter = (await admin.api.get('/admin/stats/activity?days=90')).body.data.series;

    assert.equal(week.reduce((sum, d) => sum + d.listings, 0), 2);
    assert.equal(quarter.reduce((sum, d) => sum + d.listings, 0), 3);
  });
});

describe('the category breakdown', () => {
  let admin;
  let seller;

  before(async () => {
    await clearDb();
    admin = await makeSignedInUser({ role: 'admin' });
    seller = await makeSignedInUser();

    await Category.create([
      { name: 'Books', slug: 'books' },
      { name: 'Furniture', slug: 'furniture' },
    ]);

    await makeListing(seller.user._id, { category: 'books' });
    await makeListing(seller.user._id, { category: 'books' });
    await makeListing(seller.user._id, { category: 'furniture' });
    await makeListing(seller.user._id, { category: 'books', status: 'sold' });
    // Filed under a category that has since been deleted from the list.
    await makeListing(seller.user._id, { category: 'musical-instruments' });
  });

  test('counts active listings only, biggest first', async () => {
    const { data } = (await admin.api.get('/admin/stats/categories')).body;

    assert.equal(data[0].slug, 'books');
    assert.equal(data[0].count, 2); // the sold one is not counted
    assert.equal(data.reduce((sum, c) => sum + c.count, 0), 4);
  });

  test('resolves the display name from the category list', async () => {
    const { data } = (await admin.api.get('/admin/stats/categories')).body;

    assert.equal(data.find((c) => c.slug === 'furniture').name, 'Furniture');
  });

  // A listing stores its category as a plain slug, so it can outlive the
  // Category row it was filed under. Showing the bare slug tells a
  // moderator more than quietly dropping those listings from the chart.
  test('a listing whose category is gone keeps its slug rather than vanishing', async () => {
    const { data } = (await admin.api.get('/admin/stats/categories')).body;
    const orphan = data.find((c) => c.slug === 'musical-instruments');

    assert.ok(orphan, 'the orphaned category was dropped from the chart');
    assert.equal(orphan.name, 'musical-instruments');
    assert.equal(orphan.count, 1);
  });
});
