// The arithmetic behind the semantic matcher.
//
// Worth its own file because every bug in here surfaces as "the matches are
// a bit wrong", which nobody notices until somebody complains about their
// alerts. Hand-made vectors, no model and no network.

require('../helpers/env');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { cosine, sourceHash, isFresh } = require('../../src/matchers/vector');

describe('cosine similarity', () => {
  test('the same direction is 1, whatever the length', () => {
    assert.equal(cosine([1, 0, 0], [1, 0, 0]), 1);
    // The magnitude must not matter — only the direction does. This is what
    // the division buys over a plain dot product.
    assert.equal(cosine([1, 0, 0], [7, 0, 0]), 1);
    assert.ok(Math.abs(cosine([1, 2, 3], [2, 4, 6]) - 1) < 1e-12);
  });

  test('right angles are 0 and opposites are -1', () => {
    assert.equal(cosine([1, 0], [0, 1]), 0);
    assert.equal(cosine([1, 0], [-1, 0]), -1);
  });

  test('closer directions score higher', () => {
    const asked = [1, 0];
    const near = cosine(asked, [1, 0.2]);
    const far = cosine(asked, [1, 3]);

    assert.ok(near > far, `${near} should beat ${far}`);
    assert.ok(near < 1);
  });

  describe('the inputs that would otherwise throw', () => {
    test('mismatched lengths score 0 rather than comparing nonsense', () => {
      // This is what a model change looks like if nothing catches it: two
      // vectors from different spaces. Zero keeps it below any threshold.
      assert.equal(cosine([1, 2, 3], [1, 2]), 0);
    });

    test('empty, missing and malformed inputs score 0', () => {
      assert.equal(cosine([], []), 0);
      assert.equal(cosine(null, [1]), 0);
      assert.equal(cosine([1], undefined), 0);
      assert.equal(cosine('not a vector', [1]), 0);
    });

    test('a zero vector scores 0 instead of dividing by zero', () => {
      assert.equal(cosine([0, 0, 0], [1, 2, 3]), 0);
      assert.ok(Number.isFinite(cosine([0, 0], [0, 0])));
    });
  });
});

describe('spotting a stale vector', () => {
  test('the same text hashes the same way, different text does not', () => {
    assert.equal(sourceHash('Avon cycle', 'barely used'), sourceHash('Avon cycle', 'barely used'));
    assert.notEqual(sourceHash('Avon cycle', 'barely used'), sourceHash('Avon cycle', 'well used'));
  });

  test('the fields are hashed separately, not glued together', () => {
    // Without a separator, ("ab", "c") and ("a", "bc") would be one string
    // and an edit that moved a word between title and description would go
    // unnoticed.
    assert.notEqual(sourceHash('ab', 'c'), sourceHash('a', 'bc'));
  });

  test('missing text is stable rather than a crash', () => {
    assert.equal(sourceHash(undefined, null), sourceHash(undefined, null));
  });

  test('a cached vector is fresh only if text and model both still match', () => {
    const hash = sourceHash('Avon cycle', '');
    const cached = { vector: [1, 2], model: 'm1', sourceHash: hash };

    assert.equal(isFresh(cached, hash, 'm1'), true);
    assert.equal(isFresh(cached, sourceHash('other', ''), 'm1'), false, 'the listing was edited');
    assert.equal(isFresh(cached, hash, 'm2'), false, 'the embedding model changed');
  });

  test('half-written cache entries are not fresh', () => {
    const hash = sourceHash('x', '');
    assert.equal(isFresh(undefined, hash, 'm1'), false);
    assert.equal(isFresh({ model: 'm1', sourceHash: hash }, hash, 'm1'), false, 'no vector');
    assert.equal(
      isFresh({ vector: [], model: 'm1', sourceHash: hash }, hash, 'm1'),
      false,
      'an empty vector is a failed write, not a cache hit'
    );
  });
});
