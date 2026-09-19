// The rules for what a chat message and an offer may be. Shared by the
// socket handler and the REST fallback, so these are the only copy of them.
// As with the validators, what matters most is what they refuse.
//
// No database and no sockets: pure functions. The socket-level checks — who
// may post into which conversation — are in client/tests/e2e/
// chat-security.test.mjs, which needs a running server.

require('../helpers/env');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { parseMessage, parseOfferAmount, MAX_TEXT } = require('../../src/utils/chatMessage');

describe('parseMessage', () => {
  test('keeps a normal message, trimmed', () => {
    assert.deepEqual(parseMessage({ text: '  still there?  ' }).value, { type: 'text', text: 'still there?' });
  });

  test('refuses an empty or whitespace-only message', () => {
    for (const text of ['', '   ', undefined, null]) assert.ok(parseMessage({ text }).error, `for ${text}`);
  });

  test('refuses a message that is not a string', () => {
    assert.ok(parseMessage({ text: { $gt: '' } }).error);
    assert.ok(parseMessage({ text: 42 }).error);
  });

  test(`caps a message at ${MAX_TEXT} characters`, () => {
    assert.ok(parseMessage({ text: 'x'.repeat(MAX_TEXT) }).value);
    assert.ok(parseMessage({ text: 'x'.repeat(MAX_TEXT + 1) }).error);
  });

  test('refuses type "offer": offers carry an amount and have their own path', () => {
    assert.ok(parseMessage({ type: 'offer', text: 'fake offer card' }).error);
  });

  test('refuses an unknown type', () => {
    assert.ok(parseMessage({ type: 'system', text: 'you have been banned' }).error);
  });

  test('an image needs an https link', () => {
    assert.ok(parseMessage({ type: 'image', imageUrl: 'https://res.cloudinary.com/x.jpg' }).value);
    for (const imageUrl of ['javascript:alert(1)', 'http://x.jpg', '', undefined]) {
      assert.ok(parseMessage({ type: 'image', imageUrl }).error, `for ${imageUrl}`);
    }
  });

  test('drops fields that do not belong to the type', () => {
    assert.deepEqual(parseMessage({ text: 'hi', imageUrl: 'https://x', offerAmount: 5 }).value, {
      type: 'text',
      text: 'hi',
    });
  });
});

describe('parseOfferAmount', () => {
  test('accepts zero and whole rupees, rounding paise away', () => {
    assert.equal(parseOfferAmount(0).value, 0);
    assert.equal(parseOfferAmount(450).value, 450);
    assert.equal(parseOfferAmount('450').value, 450);
    assert.equal(parseOfferAmount(449.6).value, 450);
  });

  test('refuses anything that is not an amount', () => {
    for (const amount of [-1, '-1', 'lots', '', NaN, Infinity, null, undefined, true, false, {}, [], 1e9]) {
      assert.ok(parseOfferAmount(amount).error, `for ${String(amount)}`);
    }
  });
});
