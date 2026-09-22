const { createQueue } = require('./queue');
const { runWantedMatches } = require('../services/wantedMatch.service');

const wantedMatchQueue = createQueue('wantedMatch');

wantedMatchQueue.process(async () => {
  const result = await runWantedMatches();
  console.log(
    `wantedMatch job (${result.matcher}): checked ${result.checked}, notified ${result.notified}`
  );
  return result;
});

const scheduleWantedMatchJob = async () => {
  // Hourly, on the half hour. Offset from savedSearchAlert's `0 * * * *` so
  // the two do not scan listings at the same moment, and so a student who
  // has both a saved search and a wanted post is not notified twice in the
  // same second.
  await wantedMatchQueue.add(
    {},
    { repeat: { cron: '30 * * * *' }, removeOnComplete: true, removeOnFail: true }
  );
};

module.exports = { wantedMatchQueue, scheduleWantedMatchJob };
