const { createQueue } = require('./queue');
const { runCrossSell } = require('../services/crossSell.service');

const crossSellQueue = createQueue('crossSell');

crossSellQueue.process(async () => {
  const result = await runCrossSell();
  console.log(
    `crossSell job (${result.generator}): checked ${result.checked}, ` +
      `generated ${result.generated}, from map ${result.map}, none ${result.none}`
  );
  return result;
});

const scheduleCrossSellJob = async () => {
  // Every hour at :15. The three hourly jobs sit at :00 (savedSearch), :15
  // (this) and :30 (wantedMatch) so they do not all wake at once and race
  // each other for the same free-tier Redis and the same Mongo connections.
  await crossSellQueue.add(
    {},
    { repeat: { cron: '15 * * * *' }, removeOnComplete: true, removeOnFail: true }
  );
};

module.exports = { crossSellQueue, scheduleCrossSellJob };
