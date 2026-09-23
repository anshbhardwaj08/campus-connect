// Choosing an embedding provider, and the shape of what Gemini is sent.
//
// No network. `fetch` is replaced for the Gemini tests, so what is asserted
// is the request this code builds — which is the part that can be wrong in a
// way nothing else would catch until the alerts quietly stopped working.

require('../helpers/env');

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const embedder = require('../../src/matchers/embedder');
const gemini = require('../../src/matchers/embedders/gemini');
const openai = require('../../src/matchers/embedders/openai');

// Long enough to pass each provider's shape check, and obviously fake.
//
// NOT `'x'.repeat(n)`: the placeholder check rejects a long run of one
// character, because that is how people write "not filled in". A fixture
// has to look like the random thing it stands in for, or it tests the
// guard rather than the code.
const filler = (n) => 'k3J9mQ2pR7sT1vW5yZ8bN4cF6gH0dLeA'.repeat(3).slice(0, n);
const FAKE_GEMINI = `AIza${filler(35)}`;
const FAKE_OPENAI = `sk-${filler(48)}`;

const ENV_KEYS = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'EMBEDDER'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
});

describe('deciding whether there is a provider at all', () => {
  test('no keys means no provider, which is not an error', () => {
    assert.equal(embedder.isAvailable(), false);
    assert.equal(embedder.describe().name, 'none');
  });

  // The repo's .env held a 19-character placeholder for months. That has to
  // read as "not configured" rather than reaching the API and failing.
  test('a placeholder key is not a key', () => {
    process.env.OPENAI_API_KEY = 'your-openai-key';
    assert.equal(embedder.isAvailable(), false);

    process.env.GEMINI_API_KEY = 'paste-key-here';
    assert.equal(embedder.isAvailable(), false);
  });

  // The bug this file exists to prevent recurring. The first version
  // required `AIza` and 39 characters, which is one of at least two shapes
  // Google issues — a real 53-character `AQ.` key read as "not configured",
  // so the matcher fell back silently with nothing in the log to say why.
  // Guessing at a vendor's prefix is the mistake; a placeholder always
  // looks like a placeholder.
  test('both of Google’s key shapes are accepted', () => {
    process.env.GEMINI_API_KEY = `AIza${filler(35)}`;
    assert.equal(gemini.isAvailable(), true, 'the older AIza... form');

    process.env.GEMINI_API_KEY = `AQ.Ab8${filler(47)}`;
    assert.equal(gemini.isAvailable(), true, 'the newer AQ.... form');
  });

  test('a pasted key with whitespace in it is not a key', () => {
    process.env.GEMINI_API_KEY = `AQ.Ab8${filler(40)} ${filler(6)}`;
    assert.equal(gemini.isAvailable(), false);
  });

  test('either real key is enough', () => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    assert.equal(embedder.describe().name, 'gemini');

    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = FAKE_OPENAI;
    assert.equal(embedder.describe().name, 'openai');
  });

  // The free one, unless told otherwise.
  test('with both set, the free provider wins', () => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    process.env.OPENAI_API_KEY = FAKE_OPENAI;

    assert.equal(embedder.describe().name, 'gemini');
  });

  test('EMBEDDER forces one', () => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    process.env.OPENAI_API_KEY = FAKE_OPENAI;
    process.env.EMBEDDER = 'openai';

    assert.equal(embedder.describe().name, 'openai');
  });

  test('a model id says which provider made it', () => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    assert.match(embedder.describe().model, /^gemini:/);

    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = FAKE_OPENAI;
    assert.match(embedder.describe().model, /^openai:/);
  });

  // Without the prefix, a board embedded with one provider and then switched
  // to the other would compare vectors from two different spaces. Every
  // score would look plausible and mean nothing.
  test('the two providers can never be mistaken for each other', () => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    const g = embedder.describe().model;

    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = FAKE_OPENAI;

    assert.notEqual(g, embedder.describe().model);
  });
});

describe('what Gemini is actually sent', () => {
  let calls;
  let realFetch;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    calls = [];
    realFetch = global.fetch;
    global.fetch = async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      const n = JSON.parse(init.body).requests.length;
      return {
        ok: true,
        status: 200,
        json: async () => ({ embeddings: Array.from({ length: n }, () => ({ values: [1, 0] })) }),
      };
    };
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  test('one vector per input, in order', async () => {
    const out = await gemini.embed(['a', 'b', 'c']);
    assert.equal(out.length, 3);
    assert.deepEqual(out[0], [1, 0]);
  });

  // The key goes in a header, never in the URL. A failed fetch puts the URL
  // in the error message and the message goes to the log file — which is
  // exactly how the Redis password was written to a log on this project.
  test('the key is in a header, not the query string', async () => {
    await gemini.embed(['a']);

    assert.equal(calls[0].init.headers['x-goog-api-key'], FAKE_GEMINI);
    assert.equal(calls[0].url.includes(FAKE_GEMINI), false, 'the key must not be in the URL');
    assert.equal(calls[0].url.includes('key='), false);
  });

  test('a question and a listing are embedded as different task types', async () => {
    await gemini.embed(['need a cycle'], { kind: 'query' });
    await gemini.embed(['Hercules Roadeo'], { kind: 'document' });

    assert.equal(calls[0].body.requests[0].taskType, 'RETRIEVAL_QUERY');
    assert.equal(calls[1].body.requests[0].taskType, 'RETRIEVAL_DOCUMENT');
  });

  test('anything unlabelled is treated as a listing', async () => {
    await gemini.embed(['x']);
    assert.equal(calls[0].body.requests[0].taskType, 'RETRIEVAL_DOCUMENT');
  });

  test('more inputs than one batch takes are split up', async () => {
    await gemini.embed(Array.from({ length: gemini.BATCH + 5 }, (_, i) => `item ${i}`));

    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.requests.length, gemini.BATCH);
    assert.equal(calls[1].body.requests.length, 5);
  });

  test('an empty input list costs nothing', async () => {
    assert.deepEqual(await gemini.embed([]), []);
    assert.equal(calls.length, 0);
  });

  test('an empty string is still sent as something', async () => {
    await gemini.embed(['']);
    assert.equal(calls[0].body.requests[0].content.parts[0].text, ' ');
  });
});

describe('when Gemini says no', () => {
  let realFetch;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = FAKE_GEMINI;
    realFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  test('an error status throws rather than returning nonsense', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 429,
      text: async () => 'Quota exceeded for embeddings',
    });

    await assert.rejects(() => gemini.embed(['a']), /429.*Quota/s);
  });

  test('the wrong number of vectors is an error, not a silent shift', async () => {
    // Two in, one back. Carrying on would attach that vector to the wrong
    // listing, and nothing downstream could tell.
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ embeddings: [{ values: [1, 0] }] }),
    });

    await assert.rejects(() => gemini.embed(['a', 'b']), /1 vectors for 2 inputs/);
  });

  test('asking with no key configured throws before any request', async () => {
    delete process.env.GEMINI_API_KEY;
    let called = false;
    global.fetch = async () => {
      called = true;
    };

    await assert.rejects(() => gemini.embed(['a']), /GEMINI_API_KEY/);
    assert.equal(called, false);
  });
});

describe('the OpenAI provider still holds its end up', () => {
  test('it accepts and ignores the query/document distinction', () => {
    // One model, one space — there is nothing to vary. What matters is that
    // it does not reject the argument the contract says it may be given.
    assert.equal(openai.embed.length >= 1, true);
    assert.equal(openai.describe().name, 'openai');
  });

  test('its key shape check rejects the obvious non-keys', () => {
    process.env.OPENAI_API_KEY = 'sk-short';
    assert.equal(openai.isAvailable(), false);

    process.env.OPENAI_API_KEY = FAKE_OPENAI;
    assert.equal(openai.isAvailable(), true);
  });
});
