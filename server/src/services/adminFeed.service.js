// The dashboard ticker's source. Moderators sitting on the dashboard get
// counters that move as things happen on the marketplace, rather than a
// number that was true whenever the page last loaded.
//
// Fire-and-forget on purpose: a dropped tick is one stale figure on one
// screen. It must never turn into a failed request for the student whose
// action triggered it, so nothing here throws and nothing here is awaited.

const { getSocketIO } = require('./socketRegistry');

const ADMIN_ROOM = 'admins';

// Kinds match the fields of one day in GET /admin/stats/activity, so the
// ticker can seed itself from today's bucket and then increment the same
// counters live.
const emitAdminActivity = (kind) => {
  try {
    getSocketIO()?.to(ADMIN_ROOM).emit('admin:activity', { kind, at: new Date().toISOString() });
  } catch {
    // A dashboard tick is never worth failing the action that caused it.
  }
};

module.exports = { ADMIN_ROOM, emitAdminActivity };
