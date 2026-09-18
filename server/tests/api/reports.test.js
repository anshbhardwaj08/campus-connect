// The moderation queue.
//
// POST /reports spread req.body straight into Report.create — on the one
// queue moderators are meant to trust. A client could file a report that
// arrived pre-resolved, carrying its own note and a resolvedBy pointing at
// anyone.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeSignedInUser, makeListing } = require('../helpers/factory');
const Report = require('../../src/models/Report');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

describe('filing a report', () => {
  let reporter;
  let seller;
  let listing;

  before(async () => {
    await clearDb();
    reporter = await makeSignedInUser();
    seller = await makeSignedInUser();
    listing = await makeListing(seller.user._id);
  });

  test('signing in is required', async () => {
    const res = await client().post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
      reason: 'Scam',
    });

    assert.equal(res.status, 401);
  });

  test('a report opens with the caller as its reporter', async () => {
    const res = await reporter.api.post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
      reason: 'Looks like a scam',
      description: 'Asked me to pay on UPI before meeting.',
    });

    assert.equal(res.status, 201);
    const report = await Report.findById(res.body.data.report._id);
    assert.equal(String(report.reporterId), String(reporter.user._id));
    assert.equal(report.status, 'open');
    assert.equal(report.description, 'Asked me to pay on UPI before meeting.');
  });

  test('a report cannot arrive already resolved', async () => {
    const res = await reporter.api.post('/reports', {
      targetType: 'user',
      targetId: String(seller.user._id),
      reason: 'Never turned up',
      status: 'resolved',
      adminNote: 'Looked at it myself, all fine',
      resolvedBy: String(reporter.user._id),
    });

    assert.equal(res.status, 201);
    const report = await Report.findById(res.body.data.report._id);
    assert.equal(report.status, 'open');
    assert.ok(!report.adminNote);
    assert.ok(!report.resolvedBy);
  });

  test('you cannot report yourself', async () => {
    const res = await reporter.api.post('/reports', {
      targetType: 'user',
      targetId: String(reporter.user._id),
      reason: 'Testing',
    });

    assert.equal(res.status, 400);
  });

  test('a reason is required', async () => {
    const res = await reporter.api.post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
    });

    assert.equal(res.status, 400);
  });

  // Clicking report twice, or reporting the same listing again next week
  // while the first is still open, must not put two of the same thing in
  // front of a moderator.
  test('reporting the same thing again returns the first one', async () => {
    const before = await Report.countDocuments({ targetId: listing._id });

    const res = await reporter.api.post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
      reason: 'Looks like a scam',
    });

    assert.equal(res.status, 200); // 200, not 201: nothing was created
    assert.match(res.body.message, /already reported/);
    assert.equal(await Report.countDocuments({ targetId: listing._id }), before);
  });

  test('somebody else reporting the same listing is a separate case', async () => {
    const other = await makeSignedInUser();

    const res = await other.api.post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
      reason: 'Same listing, different person',
    });

    assert.equal(res.status, 201);
    assert.equal(await Report.countDocuments({ targetId: listing._id }), 2);
  });

  test('once the first is closed, the same person may report it again', async () => {
    await Report.updateMany({ reporterId: reporter.user._id, targetId: listing._id }, { status: 'resolved' });

    const res = await reporter.api.post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
      reason: 'It is back',
    });

    assert.equal(res.status, 201);
  });

  test('my reports lists mine and nobody else’s', async () => {
    const mine = await reporter.api.get('/reports/me');

    assert.equal(mine.status, 200);
    assert.ok(mine.body.data.reports.length > 0);
    assert.ok(mine.body.data.reports.every((r) => String(r.reporterId) === String(reporter.user._id)));
  });
});

describe('the moderator queue', () => {
  let moderator;
  let reporter;
  let listing;

  before(async () => {
    await clearDb();
    moderator = await makeSignedInUser({ role: 'moderator' });
    reporter = await makeSignedInUser();
    const seller = await makeSignedInUser();
    listing = await makeListing(seller.user._id, { title: 'The reported listing' });
    await reporter.api.post('/reports', {
      targetType: 'listing',
      targetId: String(listing._id),
      reason: 'Looks like a scam',
    });
  });

  test('a student cannot read the queue', async () => {
    assert.equal((await reporter.api.get('/admin/reports')).status, 403);
  });

  // A bare ObjectId made the queue unactionable: a moderator could not tell
  // what had been reported without going and looking it up.
  test('the queue names what was reported instead of printing an id', async () => {
    const res = await moderator.api.get('/admin/reports?status=open');

    assert.equal(res.status, 200);
    const [report] = res.body.data.reports;
    assert.equal(report.targetLabel, 'The reported listing');
  });

  test('resolving takes it out of the open queue and records the note', async () => {
    const open = (await moderator.api.get('/admin/reports?status=open')).body.data.reports;

    const res = await moderator.api.patch(`/admin/reports/${open[0]._id}/resolve`, {
      status: 'resolved',
      adminNote: 'Seller warned',
    });

    assert.equal(res.status, 200);
    const stored = await Report.findById(open[0]._id);
    assert.equal(stored.status, 'resolved');
    assert.equal(stored.adminNote, 'Seller warned');
    assert.equal(String(stored.resolvedBy), String(moderator.user._id));

    assert.equal((await moderator.api.get('/admin/reports?status=open')).body.data.reports.length, 0);
  });
});
