// Works out which hires need a nudge, and sends them.
//
// Kept out of the job file on purpose: that one constructs a Bull queue at
// import time, which opens a Redis connection and keeps the process alive.
// Anything wanting to run this check — a test, a one-off script, a future
// admin button — should not have to stand up a queue to do it.
//
// Each deal gets at most one "due tomorrow" and one "overdue" notification,
// stamped on the deal itself. A reminder repeated every morning gets muted,
// and then the one that matters is muted too.

const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { createNotification } = require('./notification.service');

const DAY_MS = 86400000;

const formatDay = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const titleOf = async (listingId) => {
  const listing = await Listing.findById(listingId).select('title').lean();
  return listing?.title || 'the item';
};

const nameOf = async (userId) => {
  const user = await User.findById(userId).select('name').lean();
  return user?.name || 'the other person';
};

const notify = (userId, payload) =>
  createNotification({ userId, type: 'deal', ...payload }).catch(() => {});

const runRentalDueCheck = async (now = new Date()) => {
  let dueSoon = 0;
  let overdue = 0;

  // Still out: a due date was set at handover and nobody has marked it back.
  const open = await Deal.find({
    dueAt: { $ne: null },
    returnedAt: null,
    status: 'completed',
  });

  for (const deal of open) {
    const msLeft = new Date(deal.dueAt).getTime() - now.getTime();

    // Overdue tells both sides. The renter may simply have forgotten; the
    // owner needs to know their thing has not come back, and only they can
    // chase it or mark it returned.
    if (msLeft < 0 && !deal.overdueNotifiedAt) {
      const days = Math.max(1, Math.floor(-msLeft / DAY_MS));
      const [title, renter, owner] = await Promise.all([
        titleOf(deal.listingId),
        nameOf(deal.buyerId),
        nameOf(deal.sellerId),
      ]);
      const late = `${days} day${days === 1 ? '' : 's'} late`;

      await Promise.all([
        notify(deal.buyerId, {
          title: `${title} is overdue`,
          message: `It was due back to ${owner} on ${formatDay(deal.dueAt)} — ${late}.`,
          link: '/deals',
        }),
        notify(deal.sellerId, {
          title: `${title} has not come back`,
          message: `${renter} was due to return it on ${formatDay(deal.dueAt)} — ${late}.`,
          link: '/deals',
        }),
      ]);

      deal.overdueNotifiedAt = now;
      await deal.save();
      overdue += 1;
      continue;
    }

    // The day before. Only the renter is nudged — the owner has nothing to
    // do about a hire that is still running to plan.
    if (msLeft >= 0 && msLeft <= DAY_MS && !deal.dueSoonNotifiedAt) {
      const [title, owner] = await Promise.all([titleOf(deal.listingId), nameOf(deal.sellerId)]);

      await notify(deal.buyerId, {
        title: `${title} is due back tomorrow`,
        message: `Arrange a time with ${owner} to hand it over.`,
        link: '/deals',
      });

      deal.dueSoonNotifiedAt = now;
      await deal.save();
      dueSoon += 1;
    }
  }

  return { dueSoon, overdue, checked: open.length };
};

module.exports = { runRentalDueCheck };
