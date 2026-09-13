const Queue = require('bull');
const { runSavedSearchAlerts } = require('../services/savedSearch.service');

const savedSearchAlertQueue = new Queue('savedSearchAlert', process.env.REDIS_URL);

savedSearchAlertQueue.process(async () => {
  const result = await runSavedSearchAlerts();
  console.log(`savedSearchAlert job: checked ${result.checked}, notified ${result.notified}`);
  return result;
});

const scheduleSavedSearchAlertJob = async () => {
  await savedSearchAlertQueue.add(
    {},
    { repeat: { cron: '0 * * * *' }, removeOnComplete: true, removeOnFail: true } // hourly
  );
};

module.exports = { savedSearchAlertQueue, scheduleSavedSearchAlertJob };
