// What a piece of text is about.
//
// This is the whole reason the wanted board can match anything: the words a
// student asks with are almost never the words the seller wrote. No database
// here — conceptsOf is pure, and these are the cases the synonym list exists
// to get right.

require('../helpers/env');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { conceptsOf } = require('../../src/matchers/vocabulary');

const shares = (a, b) => {
  const left = conceptsOf(a);
  return [...conceptsOf(b)].some((concept) => left.has(concept));
};

describe('different words for the same thing', () => {
  // The case that started all this. Neither string contains the other's noun.
  test('a cycle and a bike are the same thing', () => {
    assert.equal(shares('need a cycle for campus', 'Hercules Roadeo 26in gear bike'), true);
  });

  test('a brand name stands in for the thing', () => {
    assert.equal(shares('calculator', 'Casio fx-991 scientific, barely used'), true);
    assert.equal(shares('want a laptop under 30k', 'ThinkPad T480, 16GB RAM'), true);
    assert.equal(shares('badminton racket', 'Yonex Nanoray, two of them'), true);
  });

  test('a description matches the plain word for it', () => {
    assert.equal(shares('study table', 'writing desk with drawers'), true);
    assert.equal(shares('lab coat', 'white apron, first year chemistry'), true);
    assert.equal(shares('earphones', 'boAt neckband, working fine'), true);
  });

  test('plurals are the same thing as singulars', () => {
    assert.equal(shares('looking for books', 'Physics textbook'), true);
    assert.equal(shares('cycles', 'cycle in good condition'), true);
  });
});

describe('things that are not the same thing', () => {
  test('a chair is not a cycle', () => {
    assert.equal(shares('need a cycle', 'revolving study chair'), false);
  });

  // A phrase is consumed whole, so its words are not counted separately.
  test('table tennis is not a table', () => {
    assert.equal(shares('study table', 'table tennis bat, almost new'), false);
  });

  // Deliberately absent from the vocabulary: on a campus "notebook" is
  // stationery far more often than a computer, and guessing wrong notifies
  // the wrong person.
  test('a notebook is not assumed to be a laptop', () => {
    assert.equal(shares('laptop', 'college notebook, 200 pages'), false);
  });

  test('filler words alone match nothing', () => {
    assert.equal(shares('urgently need something good cheap', 'used table in good condition'), false);
  });
});

describe('the awkward inputs', () => {
  test('a post with nothing in it is about nothing', () => {
    assert.equal(conceptsOf('').size, 0);
    assert.equal(conceptsOf('   ').size, 0);
    assert.equal(conceptsOf(null, undefined).size, 0);
  });

  // Real rows from the live board. Junk must produce no concepts at all —
  // a matcher that finds "dbjs" interesting would notify somebody about
  // everything.
  test('junk is about nothing useful', () => {
    assert.equal(shares('dbjs', 'HP Laptop'), false);
    assert.equal(shares('need one urgently please', 'Used Physics Textbook'), false);
  });

  test('a title of pure stopwords is empty, not everything', () => {
    assert.equal(conceptsOf('looking for any good cheap one urgently').size, 0);
  });

  test('punctuation and case do not matter', () => {
    assert.equal(shares('CALCULATOR!!!', 'casio fx-991'), true);
  });
});

// Not a bug — the ceiling of the approach, written down so the next person
// does not spend an afternoon trying to fix it with more synonyms. A list
// maps words to words; it cannot work out that a thing you study on is a
// desk. That inference is what a semantic matcher buys, and this test is
// what should start passing the day one is swapped in behind matchers/.
describe('what a word list cannot do', () => {
  test('a roundabout description of a thing does not find it', () => {
    assert.equal(shares('something to study on', 'study table with drawers'), false);
    assert.equal(shares('keep my food cold', 'mini fridge, 90L'), false);
  });
});

describe('unknown words still count', () => {
  // The vocabulary only ever ADDS matches. Anything it has never heard of
  // falls through as itself, so this is never worse than plain word overlap.
  test('two words nobody listed still match each other', () => {
    assert.equal(shares('Cengel thermodynamics', 'thermodynamics by Cengel, 7th ed'), true);
  });

  test('an unknown word is not matched to an unrelated one', () => {
    assert.equal(shares('Cengel thermodynamics', 'Griffiths electrodynamics'), false);
  });
});
