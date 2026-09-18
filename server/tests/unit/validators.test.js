// The validators are the allow-lists. Several of them exist because a
// handler used to spread req.body straight into a model, so what matters
// most here is what they REFUSE — a field silently accepted is the bug.
//
// No database and no HTTP: these are pure schema checks.

require('../helpers/env');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { createListingSchema, updateListingSchema } = require('../../src/validators/listing.validator');
const { createReportSchema } = require('../../src/validators/report.validator');
const { createReviewSchema } = require('../../src/validators/review.validator');
const {
  createEventSchema,
  createLostFoundSchema,
  createCarpoolSchema,
} = require('../../src/validators/community.validator');

// Mirrors middleware/validate.js — stripUnknown is half the protection, so
// testing the schema without it would test the wrong thing.
const check = (schema, body) => {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  return { ok: !error, messages: error ? error.details.map((d) => d.message) : [], value };
};

const saleListing = (overrides = {}) => ({
  title: 'Physics textbook, second year',
  description: 'Barely opened. Selling because the course changed.',
  price: 400,
  category: 'books',
  condition: 'used',
  ...overrides,
});

describe('listing validator', () => {
  test('accepts a plain sale', () => {
    assert.ok(check(createListingSchema, saleListing()).ok);
  });

  test('requires a period on a rental', () => {
    const result = check(createListingSchema, saleListing({ listingType: 'rent' }));

    assert.equal(result.ok, false);
    assert.ok(result.messages.some((m) => m.includes('rentPeriod')));
  });

  // Without this a sale could carry a stray "per month" that the card and
  // the detail page would then print.
  test('forbids a period on a sale', () => {
    const result = check(createListingSchema, saleListing({ rentPeriod: 'month' }));

    assert.equal(result.ok, false);
    assert.ok(result.messages.some((m) => m.includes('rentPeriod')));
  });

  test('forbids a deposit on a sale', () => {
    const result = check(createListingSchema, saleListing({ securityDeposit: 1000 }));

    assert.equal(result.ok, false);
    assert.ok(result.messages.some((m) => m.includes('securityDeposit')));
  });

  test('accepts a rental with a period and a deposit', () => {
    const result = check(
      createListingSchema,
      saleListing({ listingType: 'rent', rentPeriod: 'day', securityDeposit: 1500 })
    );

    assert.ok(result.ok, result.messages.join(', '));
    assert.equal(result.value.rentPeriod, 'day');
    assert.equal(result.value.securityDeposit, 1500);
  });

  // An edit has to restate the kind. Left optional, the rent rules have
  // nothing to test against, and changing the title would strip a rental's
  // period and deposit — silently turning a hire into a sale.
  test('an edit must say which kind of listing it is', () => {
    const result = check(updateListingSchema, { title: 'A new title, nothing else changed' });

    assert.equal(result.ok, false);
    assert.ok(result.messages.some((m) => m.includes('listingType')));
  });

  test('an edit that restates the kind may change one field', () => {
    const result = check(updateListingSchema, {
      listingType: 'rent',
      rentPeriod: 'week',
      title: 'A new title, nothing else changed',
    });

    assert.ok(result.ok, result.messages.join(', '));
  });

  test('server-owned fields are stripped rather than trusted', () => {
    const result = check(
      createListingSchema,
      saleListing({ status: 'active', scamScore: 0, sellerId: 'somebody-else', viewCount: 9999 })
    );

    assert.ok(result.ok);
    assert.equal(result.value.status, undefined);
    assert.equal(result.value.scamScore, undefined);
    assert.equal(result.value.sellerId, undefined);
    assert.equal(result.value.viewCount, undefined);
  });
});

describe('report validator', () => {
  const report = { targetType: 'listing', targetId: 'a'.repeat(24), reason: 'Looks like a scam' };

  test('accepts a well-formed report', () => {
    assert.ok(check(createReportSchema, report).ok);
  });

  test('refuses a target type it does not know', () => {
    assert.equal(check(createReportSchema, { ...report, targetType: 'carpool' }).ok, false);
  });

  test('requires a reason', () => {
    const { reason, ...withoutReason } = report;
    assert.equal(check(createReportSchema, withoutReason).ok, false);
  });

  // The queue moderators are meant to trust. A client could otherwise file
  // a report that arrived pre-resolved, carrying its own note and a
  // resolvedBy pointing at whoever it liked.
  test('a report cannot arrive already resolved', () => {
    const { value } = check(createReportSchema, {
      ...report,
      status: 'resolved',
      adminNote: 'Looked at it myself, all fine',
      resolvedBy: 'b'.repeat(24),
      reporterId: 'c'.repeat(24),
    });

    assert.equal(value.status, undefined);
    assert.equal(value.adminNote, undefined);
    assert.equal(value.resolvedBy, undefined);
    assert.equal(value.reporterId, undefined);
  });
});

describe('review validator', () => {
  // Everything that decides who is being reviewed comes from the deal. The
  // trust score is built on this, so the schema must not even accept them.
  test('reviewee, listing and type are not settable from the request', () => {
    const { ok, value } = check(createReviewSchema, {
      dealId: 'd'.repeat(24),
      rating: 5,
      revieweeId: 'e'.repeat(24),
      listingId: 'f'.repeat(24),
      type: 'seller',
    });

    assert.ok(ok);
    assert.equal(value.revieweeId, undefined);
    assert.equal(value.listingId, undefined);
    assert.equal(value.type, undefined);
  });

  test('refuses a rating outside one to five', () => {
    assert.equal(check(createReviewSchema, { dealId: 'd'.repeat(24), rating: 6 }).ok, false);
    assert.equal(check(createReviewSchema, { dealId: 'd'.repeat(24), rating: 0 }).ok, false);
  });
});

describe('community validators', () => {
  test('an event cannot arrive claiming RSVPs it has not had', () => {
    const { ok, value } = check(createEventSchema, {
      title: 'Inter hostel cricket',
      date: new Date(Date.now() + 86400000).toISOString(),
      rsvpCount: 400,
      status: 'cancelled',
      organizerId: 'a'.repeat(24),
    });

    assert.ok(ok);
    assert.equal(value.rsvpCount, undefined);
    assert.equal(value.status, undefined);
    assert.equal(value.organizerId, undefined);
  });

  test('an event needs a date', () => {
    assert.equal(check(createEventSchema, { title: 'Something happening' }).ok, false);
  });

  test('a lost-and-found post cannot arrive pre-resolved', () => {
    const { ok, value } = check(createLostFoundSchema, {
      type: 'lost',
      title: 'Blue water bottle',
      resolved: true,
      status: 'resolved',
    });

    assert.ok(ok);
    assert.equal(value.resolved, undefined);
    assert.equal(value.status, undefined);
  });

  test('a lost-and-found post must be lost or found, not something else', () => {
    assert.equal(check(createLostFoundSchema, { type: 'stolen', title: 'A bike' }).ok, false);
  });

  test('a carpool needs contact details and a believable seat count', () => {
    const ride = {
      from: 'Campus',
      to: 'Airport',
      departureDate: new Date(Date.now() + 86400000).toISOString(),
      seatsAvailable: 3,
      contactInfo: '99999 00000',
    };

    assert.ok(check(createCarpoolSchema, ride).ok);
    assert.equal(check(createCarpoolSchema, { ...ride, contactInfo: undefined }).ok, false);
    assert.equal(check(createCarpoolSchema, { ...ride, seatsAvailable: 99 }).ok, false);
  });
});
