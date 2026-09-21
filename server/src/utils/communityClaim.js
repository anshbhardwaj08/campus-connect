// What "this is settled" means for each kind of community post.
//
// A want, a ride and a lost umbrella all end the same way in practice: the
// two people agree in the chat, and then somebody has to remember to close
// the post. Nobody did, so the board filled with rides that had left and
// wallets already handed back. This is the shared half of the handshake —
// one side asks, the owner confirms, the post updates itself.
//
// Listings are not here: a sale has its own, heavier handshake (an offer, a
// deal, a code at the gate, a review).
const Carpool = require('../models/Carpool');
const LostFound = require('../models/LostFound');
const LookingFor = require('../models/LookingFor');

const KINDS = {
  lostfound: {
    model: LostFound,
    settledStatus: 'resolved',
    // What the person who is not the owner is offering to do.
    askLabel: 'I have this',
    askedLine: 'says they have it',
    settledLine: 'Marked as resolved. The post is off the board.',
    seats: false,
  },
  lookingfor: {
    model: LookingFor,
    settledStatus: 'fulfilled',
    askLabel: 'I have this',
    askedLine: 'says they have it',
    settledLine: 'Marked as found. The request is off the board.',
    seats: false,
  },
  carpool: {
    model: Carpool,
    settledStatus: 'closed',
    askLabel: 'Ask for a seat',
    askedLine: 'asked for a seat',
    settledLine: 'Seat confirmed.',
    seats: true,
  },
};

const isClaimable = (kind) => Object.prototype.hasOwnProperty.call(KINDS, kind);

const kindConfig = (kind) => KINDS[kind] || null;

// The post a conversation is about, or null. Only ever used for posts that
// are still open to a claim.
const findSubjectPost = async (subject) => {
  const config = kindConfig(subject?.kind);
  if (!config || !subject.refId) return null;
  return config.model.findById(subject.refId);
};

// How many seats a rider may ask for, given the ride. Anything outside this
// is refused before a claim is ever written.
const validateSeats = (kind, seats) => {
  const config = kindConfig(kind);
  if (!config?.seats) return { value: undefined };
  const n = Number(seats);
  if (!Number.isInteger(n) || n < 1) return { error: 'Ask for at least one seat' };
  if (n > 8) return { error: 'That is more seats than any car has' };
  return { value: n };
};

// Applies a confirmed claim to the post, atomically.
//
// Every update is a conditional findOneAndUpdate rather than a read, a
// change and a save: two riders can confirm at the same moment, and the
// condition is what stops the ride going to -1 seats. A null result means
// the world moved on — somebody else took the last seat, or the post is
// already closed — and the caller turns that into a plain refusal.
const applyClaim = async ({ kind, refId, seats }) => {
  const config = kindConfig(kind);
  if (!config) return { error: 'That post cannot be claimed' };

  if (!config.seats) {
    const post = await config.model.findOneAndUpdate(
      { _id: refId, status: 'open' },
      { status: config.settledStatus },
      { new: true }
    );
    if (!post) return { error: 'That post is already closed' };
    return { post, closed: true };
  }

  const ride = await config.model.findOneAndUpdate(
    { _id: refId, status: 'open', seatsAvailable: { $gte: seats } },
    { $inc: { seatsAvailable: -seats } },
    { new: true }
  );
  if (!ride) return { error: 'Those seats have gone' };

  // The last seat closes the ride. Same conditional style: if another
  // confirmation got here first, this one simply finds nothing to close.
  if (ride.seatsAvailable === 0) {
    const closed = await config.model.findOneAndUpdate(
      { _id: refId, status: 'open', seatsAvailable: 0 },
      { status: config.settledStatus },
      { new: true }
    );
    return { post: closed || ride, closed: true };
  }

  return { post: ride, closed: false };
};

module.exports = { KINDS, isClaimable, kindConfig, findSubjectPost, validateSeats, applyClaim };
