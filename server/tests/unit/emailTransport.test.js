// Which transport the mailer picks, and what it sends over it.
//
// This is the path that only runs in production: on Render the free tier
// blocks outbound SMTP, so the HTTP API is the only one that reaches
// anybody. Nothing else in the suite exercises it, and "it works on my
// laptop" is exactly how the two-minute hang got shipped in the first
// place — locally SMTP is open, so the broken path never ran.
require('../helpers/env');

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const mailer = require('../../src/services/email.service');

const KEY = 'test-brevo-key';
const realFetch = global.fetch;

// Captures the call instead of making it, and answers however the test asks.
const stubFetch = ({ ok = true, status = 200, body = '{"messageId":"<abc>"}' } = {}) => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok,
      status,
      json: async () => JSON.parse(body),
      text: async () => body,
    };
  };
  return calls;
};

describe('email transport', () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = KEY;
    process.env.MAIL_FROM = 'campus@pec.edu.in';
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.MAIL_FROM;
    global.fetch = realFetch;
  });

  test('uses the HTTP API when a key is configured, SMTP when it is not', () => {
    assert.equal(mailer.useHttpApi(), true);

    delete process.env.BREVO_API_KEY;
    assert.equal(mailer.useHttpApi(), false);
  });

  test('posts the message to Brevo in the shape it expects', async () => {
    const calls = stubFetch();

    await mailer.sendPasswordResetEmail('student@pec.edu.in', 'https://example.test/reset?token=x');

    assert.equal(calls.length, 1, 'exactly one request');
    const { url, options } = calls[0];

    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['api-key'], KEY);

    const sent = JSON.parse(options.body);
    assert.equal(sent.sender.email, 'campus@pec.edu.in');
    assert.deepEqual(sent.to, [{ email: 'student@pec.edu.in' }]);
    assert.match(sent.subject, /reset/i);
    // The link is the entire point of the email.
    assert.match(sent.htmlContent, /https:\/\/example\.test\/reset\?token=x/);
  });

  test('a refusal carries Brevo’s reason, not just a status code', async () => {
    stubFetch({
      ok: false,
      status: 400,
      body: '{"code":"invalid_parameter","message":"sender email is not verified"}',
    });

    await assert.rejects(
      () => mailer.sendVerifyEmail('student@pec.edu.in', 'https://example.test/verify?token=y'),
      // An unverified sender, a spent quota and a bad key all fail here and
      // each needs a different fix, so the message has to survive.
      (err) => /400/.test(err.message) && /sender email is not verified/.test(err.message)
    );
  });

  test('falls back to SMTP when no key is set', async () => {
    delete process.env.BREVO_API_KEY;
    const calls = stubFetch();

    // env.js points SMTP at a closed port, so this fails fast rather than
    // reaching anyone. What matters is that it did not go over HTTP.
    await assert.rejects(() =>
      mailer.sendVerifyEmail('student@pec.edu.in', 'https://example.test/verify?token=z')
    );
    assert.equal(calls.length, 0, 'nothing should have gone to the HTTP API');
  });
});
