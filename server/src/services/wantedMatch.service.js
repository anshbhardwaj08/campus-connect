// Telling students when somebody lists the thing they asked for.
//
// The wanted board was write-only. A student posted "need a calculator", it
// sat there, and nothing ever looked at it again — the LookingFor model even
// carries an index commented "for matching listings" that nothing used. The
// only way to find out was to keep scrolling /browse yourself, which is the
// job the wanted board exists to save you.
//
// How the matching is done is not decided here. This service asks
// matchers/index.js and formats the answer; see that file for the seam.

const LookingFor = require('../models/LookingFor');
const { findMatches, activeName } = require('../matchers');
const { createNotification } = require('./notification.service');
const photoCaption = require('./photoCaption.service');

const MATCHES_PER_RUN = 5;

// A ceiling on how many photographs one run will read, for the same reason
// the embedder has one: the first run after this shipped looks at every post
// with a photo on it, and that should not be able to turn into one large
// bill. Whatever is left over is picked up an hour later — nothing is lost,
// it arrives late.
const CAPTION_BUDGET_PER_RUN = 20;

/**
 * @param {object} opts.captioner  the thing that reads a reference photo.
 *        Injectable for the same reason the embedder is injectable into the
 *        semantic matcher: the default one downloads an image and calls a
 *        model, and no test may do either. Production calls this with no
 *        arguments.
 */
const runWantedMatches = async ({ captioner = photoCaption } = {}) => {
  // Both `+embedding` and `+photoCaption` are select:false on the model, and
  // both have to be asked for here. Without `+embedding` the semantic matcher
  // sees no cached vector on any post and re-embeds every one of them on
  // every run — which costs money hourly, forever, and shows up nowhere
  // except the bill. Without `+photoCaption` the same is true of every
  // photograph, one model call at a time.
  const open = await LookingFor.find({
    status: 'open',
    expiresAt: { $gt: new Date() },
  }).select('+embedding +photoCaption');

  let notified = 0;
  // Counts photographs READ, which includes the ones the model looked at and
  // found nothing in — that outcome is stored too, so it is not asked again.
  let photosRead = 0;
  let captionBudget = CAPTION_BUDGET_PER_RUN;

  for (const wanted of open) {
    // Reading the photograph comes FIRST, because it changes the text the
    // post is embedded from — and therefore makes the cached vector stale,
    // which is how the caption reaches the matching without the matcher
    // knowing anything about photographs. See matchers/semantic.matcher.js.
    //
    // Its own try/catch and its own budget: this is a different provider
    // from the embedder, with a different way of being down, and a model
    // that cannot look at a picture must not stop a post being matched on
    // its words.
    if (captionBudget > 0 && wanted.images?.length) {
      try {
        // Non-null means it is new and worth storing; a caption that is
        // already good comes back as null.
        const caption = await captioner.captionFor(wanted);
        if (caption) {
          captionBudget -= 1;
          wanted.photoCaption = caption;
          await wanted.save();
          photosRead += 1;
        }
      } catch (err) {
        console.error(`wantedMatch: could not read the photo on "${wanted.title}": ${err.message}`);
      }
    }

    // First run for this post looks at the WHOLE board, not just listings
    // newer than the post. Saved searches work the other way round on
    // purpose — you ran the search, saw the results, then saved it, so only
    // new listings are news. Nobody browses before writing a wanted post,
    // so the thing they are asking for is usually already up.
    const since = wanted.lastNotifiedAt || null;

    let matches = [];
    try {
      matches = await findMatches(wanted, { since, limit: MATCHES_PER_RUN });
    } catch (err) {
      // One bad post must not stop the rest of the run. Once a matcher does
      // network calls this stops being hypothetical.
      console.error(`wantedMatch: could not match "${wanted.title}": ${err.message}`);
      continue;
    }

    if (matches.length === 0) continue;

    const best = matches[0].listing;

    await createNotification({
      userId: wanted.userId,
      type: 'wanted_match',
      title: 'Somebody is selling what you asked for',
      message:
        matches.length === 1
          ? `"${best.title}" matches your request for "${wanted.title}"`
          : `${matches.length} listings match your request for "${wanted.title}"`,
      // Straight to the best match rather than a search page. The student
      // asked a specific question; this is the answer, not a way to look for
      // the answer.
      link: `/listings/${best._id}`,
    });

    // Only moved on a hit. A post that has matched nothing keeps looking at
    // the whole board, which is what makes it find a listing posted before
    // the job last ran.
    wanted.lastNotifiedAt = new Date();
    await wanted.save();
    notified += 1;
  }

  return { checked: open.length, photosRead, notified, matcher: activeName() };
};

module.exports = { runWantedMatches };
