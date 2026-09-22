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

const MATCHES_PER_RUN = 5;

const runWantedMatches = async () => {
  // `+embedding` because the field is select:false on the model. Without it
  // the semantic matcher sees no cached vector on any post and re-embeds
  // every one of them on every run — which costs money hourly, forever, and
  // shows up nowhere except the bill.
  const open = await LookingFor.find({
    status: 'open',
    expiresAt: { $gt: new Date() },
  }).select('+embedding');

  let notified = 0;

  for (const wanted of open) {
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

  return { checked: open.length, notified, matcher: activeName() };
};

module.exports = { runWantedMatches };
