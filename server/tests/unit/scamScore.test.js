// The heuristic that decides whether a new listing goes straight onto the
// page or into a moderator's queue. Nothing else in the product can put a
// listing in `pending`, so its thresholds are worth pinning down.

require('../helpers/env');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const calculateScamScore = require('../../src/utils/scamScore');

const PENDING_AT = 70; // listing.controller.js: scamScore >= 70 -> 'pending'

describe('scam score', () => {
  test('an ordinary listing scores nothing', () => {
    const score = calculateScamScore({
      title: 'Physics textbook, second year',
      description: 'Barely opened. Selling because the course changed.',
      price: 400,
    });

    assert.equal(score, 0);
  });

  test('pressure language adds up, three phrases at a time', () => {
    const one = calculateScamScore({ title: 'Urgent sale', description: '', price: 400 });
    const three = calculateScamScore({
      title: 'Urgent sale, hurry',
      description: 'Cash only, leaving today.',
      price: 400,
    });

    assert.equal(one, 15);
    assert.equal(three, 45);
  });

  test('the pressure-language contribution caps at 45', () => {
    const everything = calculateScamScore({
      title: 'urgent hurry asap limited time act now',
      description: 'first come cash only no questions leaving today wire transfer advance payment',
      price: 400,
    });

    assert.equal(everything, 45);
  });

  test('a zero price counts against a listing unless it says free', () => {
    assert.equal(calculateScamScore({ title: 'Old chair', description: 'Take it', price: 0 }), 10);
    assert.equal(calculateScamScore({ title: 'Old chair, free', description: 'Take it', price: 0 }), 0);
  });

  test('a price far under the category average is the strongest single signal', () => {
    const giveaway = calculateScamScore({
      title: 'iPhone 14',
      description: 'Good condition',
      price: 3000,
      categoryAvgPrice: 40000,
    });
    const cheapish = calculateScamScore({
      title: 'iPhone 14',
      description: 'Good condition',
      price: 12000,
      categoryAvgPrice: 40000,
    });

    assert.equal(giveaway, 40); // under a fifth of the average
    assert.equal(cheapish, 20); // under two fifths
  });

  test('the score never goes over 100', () => {
    const worst = calculateScamScore({
      title: 'urgent hurry asap limited time act now',
      description: 'cash only wire transfer advance payment no questions leaving today',
      price: 1,
      categoryAvgPrice: 40000,
    });

    assert.equal(worst, 85);
    assert.ok(worst <= 100);
  });

  // Documented in CONTEXT.md under "Known, not a bug", and pinned here so
  // the day someone starts passing categoryAvgPrice in from the controller,
  // this test is what tells them the queue behaviour just changed.
  test('without a category average, nothing reaches the moderation threshold', () => {
    const worstWithoutAverage = calculateScamScore({
      title: 'urgent hurry asap limited time act now',
      description: 'cash only wire transfer advance payment no questions leaving today',
      price: 0,
    });

    assert.equal(worstWithoutAverage, 55);
    assert.ok(worstWithoutAverage < PENDING_AT);
  });

  test('a listing over the threshold is possible once an average is known', () => {
    const flagged = calculateScamScore({
      title: 'Urgent, leaving today',
      description: 'Cash only. No questions.',
      price: 500,
      categoryAvgPrice: 40000,
    });

    assert.ok(flagged >= PENDING_AT, `scored ${flagged}`);
  });
});
