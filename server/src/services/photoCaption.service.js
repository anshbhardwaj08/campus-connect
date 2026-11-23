// Reading the photograph on a wanted post.
//
// The wanted board gained reference photos and nothing looked at them: both
// matchers see a title and a description, which is exactly the text a want is
// worst at. "Need one of these", "this edition of the textbook", "same as the
// one in the pic" — the photograph is the request, and the words are a
// gesture at it.
//
// **Why a caption rather than an image embedding.** The obvious approach is a
// multimodal embedding: one vector covering text and pixels, compare it to
// the listings. It is the wrong shape for this codebase.
//
//   - It is a SECOND vector space. The 0.66 threshold in semantic.matcher.js
//     was calibrated by measuring a real board; a second space needs its own
//     number, measured the same way, and there is nothing to measure it on
//     yet. Two uncalibrated thresholds is worse matching, not better.
//   - Google's multimodal embedding model lives on Vertex AI, which wants a
//     GCP project and service-account auth — not the plain API key every
//     other call in here uses.
//   - The listings would have to be re-embedded into that space too, so the
//     cost is the whole board, not the handful of posts with a photo.
//
// Captioning puts the picture into the space that already exists. The model
// says what it sees in words, those words join the post's own text, and the
// existing embedder, the existing cosine and the existing threshold do the
// rest. One vector per document, one space, one calibrated number.
//
// The caption is NOT shown to anybody. It is machine-written, it is
// occasionally wrong, and a student would read it as the product putting
// words in their mouth. It exists to be embedded. `select: false` on the
// model keeps it off every response by default.
//
// Nothing here runs on a request path — the hourly job calls it, the same
// rule as cross-sell and embedding.

const generator = require('../generators');
const { winstonLogger } = require('../middleware/logger');

// Only the lead photo. A want is "a cycle like this one", not a six-angle
// record of an object somebody owns, so the second and third photos are
// nearly always the same thing again at another angle — more cost, no more
// meaning.
const PHOTOS_READ = 1;

// Cloudinary is the only place a photo on this product can live, because
// `middleware/upload.js` is the only thing that puts one anywhere. Fetching
// a URL out of the database is a request the server makes on somebody else's
// say-so, so the host is an allow-list rather than a sanity check: without
// it, a stray or tampered URL turns this into a way to make the server fetch
// an arbitrary address from inside wherever it is deployed.
const ALLOWED_HOST = /(^|\.)cloudinary\.com$/i;

// What multer already accepts (`allowed_formats` in middleware/upload.js),
// and what Gemini reads inline.
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Gemini takes rather more than this inline, but multer caps an upload at
// 5MB and Cloudinary limits the stored copy to 1600px, so anything bigger
// than this is a sign something is wrong rather than a photo to describe.
const MAX_BYTES = 6 * 1024 * 1024;

const FETCH_TIMEOUT_MS = 20000;

// A short, factual noun phrase and a few plain words — the shape that is
// useful once embedded. Not a sentence about the mood of the photograph.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    caption: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['caption'],
};

// The prompt carries the post's own words, because the same photo means
// different things depending on what was asked: a picture of a desk with a
// lamp on it is a desk if the title says desk, and a lamp if it says lamp.
//
// "Do not guess" is load-bearing. An embedded guess is indistinguishable
// from an embedded fact, and the whole value of this is that the caption is
// about the actual object in the actual photograph.
const buildPrompt = (doc) => `\
A student on a college marketplace in India has posted a WANTED request —
they are asking for this thing, they are not selling it. The photograph is a
reference: an example of the kind of thing they are after.

Their own words:
  ${doc.title}
  ${(doc.description || '').slice(0, 300)}

Describe what is actually in the photograph, so that listings of the same
kind of thing can be found.

Rules:
- One short phrase naming the object, then its visible specifics — type,
  make or model if it is legible, colour, size, condition.
- Add up to six single words somebody would search for it by.
- Only what you can see. Do not guess a brand, a price, a model number or a
  condition that is not visible. Leave it out instead.
- If the photograph does not show a thing that could be bought or borrowed,
  return an empty caption.`;

/**
 * The bytes of one image, as Gemini wants them.
 *
 * Returns null rather than throwing on anything that is merely not usable —
 * a 404 from a deleted photo, a type nobody can read — because a caption is
 * an enhancement and the post still matches without it.
 */
const defaultFetchImage = async (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOST.test(parsed.hostname)) {
    winstonLogger.warn(`photoCaption: refusing to fetch ${parsed.hostname}`);
    return null;
  }

  const res = await fetch(parsed, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) return null;

  const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(mimeType)) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;

  return { mimeType, data: buffer.toString('base64') };
};

/**
 * Whether this photo has already been read: same URL, same model.
 *
 * Keyed on the image URL rather than a hash of the bytes. Cloudinary gives
 * every upload its own URL, so a changed photo is a changed URL — and
 * re-fetching a megabyte to decide whether to re-read it would cost most of
 * what the caching saves.
 *
 * Deliberately NOT "and it has some text in it". A model that looked and
 * found nothing describable stores an empty caption, and that record is what
 * stops the question being asked again every hour for the lifetime of the
 * post. An empty `text` is a fact about the photograph, not a failed write —
 * `textOf` in the semantic matcher appends nothing for it.
 */
const isFresh = (caption, sourceUrl, model) =>
  Boolean(caption && caption.sourceUrl === sourceUrl && caption.model === model);

const createPhotoCaptioner = ({ gen = generator, fetchImage = defaultFetchImage } = {}) => {
  /**
   * Describes a document's lead photo.
   *
   * @returns {Promise<{text, model, sourceUrl, at}|null>}
   *          A NEW caption, or null for "nothing to store" — no provider, no
   *          photo, a photo that could not be read, a model that looked and
   *          found nothing worth saying, **or a caption already on the
   *          document that is still good**. Returning null for the last of
   *          those rather than handing the stored one back keeps the caller
   *          simple: anything non-null is a write.
   */
  const captionFor = async (doc) => {
    const urls = (doc.images || []).slice(0, PHOTOS_READ).filter(Boolean);
    if (urls.length === 0) return null;

    // Asked, never assumed. A provider that cannot see pictures would
    // answer from the prompt alone, and a caption invented from the title is
    // exactly the thing that would make the matching worse while looking
    // like it was working.
    if (!gen.isAvailable() || !gen.canSeeImages()) return null;

    const sourceUrl = urls[0];
    if (isFresh(doc.photoCaption, sourceUrl, gen.describe().model)) return null;

    const images = [];
    for (const url of urls) {
      const image = await fetchImage(url);
      if (image) images.push(image);
    }
    if (images.length === 0) return null;

    const answer = await gen.describeImage(images, buildPrompt(doc), RESPONSE_SCHEMA);

    const caption = String(answer?.caption || '').trim();
    const keywords = Array.isArray(answer?.keywords)
      ? answer.keywords.map((k) => String(k || '').trim()).filter(Boolean)
      : [];

    return {
      // Joined into one string because that is what gets embedded. The
      // keywords are there to widen the vector, not to be read back.
      //
      // An empty string when the model looked and found nothing it could
      // describe — a blurry wall, a screenshot of a chat. The record is
      // still written, because "this photo has been read and there was
      // nothing in it" is worth remembering: without it the same dud photo
      // costs a model call every hour until the post expires.
      text: caption ? [caption, ...keywords].join(' · ').slice(0, 600) : '',
      model: gen.describe().model,
      sourceUrl,
      at: new Date(),
    };
  };

  return { captionFor, buildPrompt, isFresh };
};

module.exports = createPhotoCaptioner();
module.exports.createPhotoCaptioner = createPhotoCaptioner;
module.exports.RESPONSE_SCHEMA = RESPONSE_SCHEMA;
module.exports.ALLOWED_HOST = ALLOWED_HOST;
