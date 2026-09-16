// Daily nudges about hires that are nearly due, and hires that are late.
// The logic lives in services/rentalDue.service.js; this file only wires it
// to a schedule.

const { createQueue } = require('./queue');
const { runRentalDueCheck } = require('../services/rentalDue.service');

const rentalDueQueue = createQueue('rentalDue');

rentalDueQueue.process(async () => {
  const result = await runRentalDueCheck();
  console.log(
    `rentalDue job: ${result.checked} hire(s) out — ${result.dueSoon} due tomorrow, ${result.overdue} overdue`
  );
  return result;
});

const scheduleRentalDueJob = async () => {
  await rentalDueQueue.add(
    {},
    { repeat: { cron: '0 9 * * *' }, removeOnComplete: true, removeOnFail: true } // 9am daily
  );
};

module.exports = { rentalDueQueue, scheduleRentalDueJob };
