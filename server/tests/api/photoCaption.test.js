// Reading the photograph on a wanted post.
//
// What is worth pinning here is not whether a model writes good captions —
// nothing offline can tell you that. It is everything around the model:
//
//   - that a provider which cannot see pictures is never asked, because a
//     caption invented from the title alone would be embedded as fact
//   - that the server will not fetch an image from anywhere but Cloudinary
//   - that a photo is read once and not once an hour
//   - that a post still matches on its words when all of this is unavailable
//
// No test here reaches the network. The generator is stubbed through the real
// seam (`generators/index.js` exports PROVIDERS, `GENERATOR` forces one) and
// the image fetcher is injected, so nothing is downloaded either.

require('../helpers/env');

const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { makeUser, makeListing } = require('../helpers/factory');
const { PROVIDERS } = require('../../src/generators');
const generator = require('../../src/generators');
const { createPhotoCaptioner } = require('../../src/services/photoCaption.service');
const { runWantedMatches } = require('../../src/services/wantedMatch.service');
const LookingFor = require('../../src/models/LookingFor');

before(startDb);
after(stopDb);

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/v1/campus-connect/cycle.jpg';

// --- stubs ---------------------------------------------------------------

// A provider that can see pictures, recording what it was shown.
const seeing = (answer = { caption: 'a black Hercules gear cycle, 26 inch', keywords: ['cycle'] }) => {
  const calls = [];
  PROVIDERS.test = {
    isAvailable: () => true,
    describe: () => ({ name: 'test', model: 'test:stub' }),
    generateJson: async () => {
      throw new Error('a caption must go through describeImage, not generateJson');
    },
    describeImage: async (images, prompt) => {
      calls.push({ images, prompt });
      return typeof answer === 'function' ? answer() : answer;
    },
  };
  process.env.GENERATOR = 'test';
  return calls;
};

// A provider exactly like the one above minus the one method — which is the
// text-only case, and the dangerous one.
const blind = () => {
  const calls = [];
  PROVIDERS.test = {
    isAvailable: () => true,
    describe: () => ({ name: 'test', model: 'test:stub' }),
    generateJson: async (prompt) => {
      calls.push(prompt);
      return { caption: 'a confident description of a photo I never saw' };
    },
  };
  process.env.GENERATOR = 'test';
  return calls;
};

const fakeFetch = (image = { mimeType: 'image/jpeg', data: 'AAAA' }) => {
  const asked = [];
  return {
    asked,
    fetchImage: async (url) => {
      asked.push(url);
      return typeof image === 'function' ? image() : image;
    },
  };
};

afterEach(() => {
  delete process.env.GENERATOR;
  delete PROVIDERS.test;
});

let student;

beforeEach(async () => {
  await clearDb();
  student = await makeUser();
});

const makeWanted = (overrides = {}) =>
  LookingFor.create({
    userId: student._id,
    title: 'need one of these',
    status: 'open',
    images: [PHOTO],
    ...overrides,
  });

describe('describing the photo', () => {
  test('the caption carries what the model saw and the words it offered', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch();
    const captioner = createPhotoCaptioner({ fetchImage });

    const caption = await captioner.captionFor(await makeWanted());

    assert.equal(caption.text, 'a black Hercules gear cycle, 26 inch · cycle');
    assert.equal(caption.model, 'test:stub');
    assert.equal(caption.sourceUrl, PHOTO);
    assert.equal(calls.length, 1);
  });

  // The post's own words go in the prompt because the same photograph means
  // different things depending on what was asked — a desk with a lamp on it
  // is a desk or a lamp depending on the title.
  test('the prompt carries the post’s own words, and says it is a want', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch();

    await createPhotoCaptioner({ fetchImage }).captionFor(
      await makeWanted({ title: 'need one of these', description: 'for the drawing paper' })
    );

    const { prompt } = calls[0];
    assert.match(prompt, /need one of these/);
    assert.match(prompt, /for the drawing paper/);
    assert.match(prompt, /WANTED/, 'or the model describes it as something for sale');
    assert.match(prompt, /Do not guess/i, 'an embedded guess is indistinguishable from a fact');
  });

  // The whole reason the capability is asked about rather than assumed.
  test('a provider that cannot see pictures is never asked', async () => {
    const calls = blind();
    const { fetchImage, asked } = fakeFetch();

    const caption = await createPhotoCaptioner({ fetchImage }).captionFor(await makeWanted());

    assert.equal(caption, null, 'no caption at all beats one invented from the title');
    assert.equal(calls.length, 0, 'and the text method is not used as a substitute');
    assert.equal(asked.length, 0, 'nor is the photo downloaded for nothing');
  });

  test('no provider at all is not an error', async () => {
    process.env.GENERATOR = 'missing';
    const { fetchImage } = fakeFetch();

    assert.equal(await createPhotoCaptioner({ fetchImage }).captionFor(await makeWanted()), null);
  });

  test('a post with no photo is not asked about', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch();

    const caption = await createPhotoCaptioner({ fetchImage }).captionFor(
      await makeWanted({ images: [] })
    );

    assert.equal(caption, null);
    assert.equal(calls.length, 0);
  });

  test('a photo that cannot be read costs nothing but the attempt', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch(() => null); // 404, wrong type, too big

    assert.equal(await createPhotoCaptioner({ fetchImage }).captionFor(await makeWanted()), null);
    assert.equal(calls.length, 0, 'the model is not asked about an image we do not have');
  });

  // Only the lead photo. A want is "a cycle like this one", not a six-angle
  // record of one object, so the rest are the same thing again.
  test('only the lead photo is read', async () => {
    seeing();
    const { fetchImage, asked } = fakeFetch();

    await createPhotoCaptioner({ fetchImage }).captionFor(
      await makeWanted({ images: [PHOTO, `${PHOTO}?2`, `${PHOTO}?3`] })
    );

    assert.deepEqual(asked, [PHOTO]);
  });
});

describe('what it will and will not fetch', () => {
  // `images` can only be written by multer, so in practice these URLs are
  // always Cloudinary's. The allow-list is there for the case where that
  // stops being true: fetching a URL out of the database is a request the
  // server makes on somebody else's say-so, from inside wherever it is
  // deployed.
  //
  // The real fetcher is used here on purpose — a refused host is turned away
  // before any request is made, so nothing leaves the process.
  test('an address that is not Cloudinary is refused, and nothing is asked', async () => {
    const calls = seeing();
    const captioner = createPhotoCaptioner();

    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'https://evil.example.com/a.jpg',
      'https://cloudinary.com.evil.example.com/a.jpg',
      'http://res.cloudinary.com/demo/a.jpg', // plain http, even on the right host
      'file:///etc/passwd',
      'not a url at all',
    ]) {
      assert.equal(
        await captioner.captionFor(await makeWanted({ images: [url] })),
        null,
        `should have refused ${url}`
      );
    }

    assert.equal(calls.length, 0);
  });
});

describe('reading a photo once', () => {
  test('a stored caption is not asked for again', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch();
    const captioner = createPhotoCaptioner({ fetchImage });

    const wanted = await makeWanted();
    wanted.photoCaption = await captioner.captionFor(wanted);

    assert.equal(calls.length, 1);
    assert.equal(await captioner.captionFor(wanted), null, 'null means nothing to write');
    assert.equal(calls.length, 1, 'and no second model call');
  });

  test('a different photo is read again', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch();
    const captioner = createPhotoCaptioner({ fetchImage });

    const wanted = await makeWanted();
    wanted.photoCaption = await captioner.captionFor(wanted);

    wanted.images = [`${PHOTO}?v2`];
    assert.ok(await captioner.captionFor(wanted), 'a new URL is a new photograph');
    assert.equal(calls.length, 2);
  });

  // A model that looks at a blurry wall and finds nothing to say is a result
  // worth storing. Without the record, that one dud photo costs a model call
  // every hour until the post expires.
  test('a photo with nothing in it is still only read once', async () => {
    const calls = seeing({ caption: '   ', keywords: [] });
    const { fetchImage } = fakeFetch();
    const captioner = createPhotoCaptioner({ fetchImage });

    const wanted = await makeWanted();
    const caption = await captioner.captionFor(wanted);

    assert.equal(caption.text, '', 'read, and empty');
    wanted.photoCaption = caption;

    assert.equal(await captioner.captionFor(wanted), null);
    assert.equal(calls.length, 1);
  });
});

describe('inside the hourly run', () => {
  // The captioner is injected, because the default one downloads an image
  // and calls a model and no test may do either. What that leaves unproven
  // is one line — the default parameter in the service — and the alternative
  // is a suite that reaches the network.
  const withStub = (fetchImage) => ({ captioner: createPhotoCaptioner({ fetchImage }) });

  test('the run reads the photo, stores the caption, and says how many', async () => {
    seeing();
    const { fetchImage } = fakeFetch();
    await makeWanted({ title: 'need one of these' });

    const result = await runWantedMatches(withStub(fetchImage));
    assert.equal(result.photosRead, 1);

    // select:false, so it has to be asked for — which is also the thing that
    // keeps a machine-written sentence off every API response.
    const stored = await LookingFor.findOne({ title: 'need one of these' }).select('+photoCaption');
    assert.match(stored.photoCaption.text, /Hercules/);

    const plain = await LookingFor.findOne({ title: 'need one of these' });
    assert.equal(plain.photoCaption, undefined, 'never returned unless asked for');
  });

  test('a second run does not read it again', async () => {
    const calls = seeing();
    const { fetchImage } = fakeFetch();
    await makeWanted();

    await runWantedMatches(withStub(fetchImage));
    await runWantedMatches(withStub(fetchImage));

    assert.equal(calls.length, 1);
  });

  // The rule the whole service is arranged around: a wanted post is never
  // worse off for the photo having been unreadable.
  test('a model that fails does not stop the post being matched on its words', async () => {
    PROVIDERS.test = {
      isAvailable: () => true,
      describe: () => ({ name: 'test', model: 'test:stub' }),
      generateJson: async () => {
        throw new Error('nope');
      },
      describeImage: async () => {
        throw new Error('the model fell over');
      },
    };
    process.env.GENERATOR = 'test';

    const seller = await makeUser();
    await makeListing(seller._id, { title: 'Hercules gear cycle', status: 'active' });
    await makeWanted({ title: 'need a cycle' });

    const { fetchImage } = fakeFetch();
    const result = await runWantedMatches(withStub(fetchImage));

    assert.equal(result.photosRead, 0);
    assert.equal(result.notified, 1, 'matched on the words, as it always could');
  });
});
