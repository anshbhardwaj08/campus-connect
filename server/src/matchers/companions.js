// What goes with what.
//
// Two jobs. It is the FALLBACK for the cross-sell when the generator is
// unreachable — and it is the reason the cross-sell works at all on a board
// this size.
//
// The thing people reach for first is collaborative filtering: "students who
// bought a phone also bought a case". That needs thousands of transactions.
// This board has about three completed deals, so it would produce nothing,
// forever, and there is no amount of cleverness that fixes a missing
// dataset. Knowledge has to come from somewhere other than the data, which
// means either a model that already knows the world (services/crossSell)
// or a list somebody wrote (this file).
//
// Keys are concepts from ./vocabulary.js. Values are what a student would
// plausibly need alongside one, in rough order of how obviously.

const { conceptsOf } = require('./vocabulary');

// `query` is what gets searched for — written the way a seller would title
// it, since that is what it is matched against.
// `reason` is shown to the student when the generator did not write one.
const COMPANIONS = {
  phone: [
    { query: 'phone case back cover', label: 'a phone case', reason: 'A drop on hostel stairs is what usually ends a phone.' },
    { query: 'tempered glass screen guard', label: 'a screen guard', reason: 'Cheaper to replace than a screen.' },
    { query: 'phone charger type c cable', label: 'a charger', reason: 'Second-hand phones rarely come with one.' },
    { query: 'power bank', label: 'a power bank', reason: 'An old battery does not last a full day of classes.' },
    { query: 'earphones headphones', label: 'earphones', reason: 'Most phones stopped including them.' },
  ],
  laptop: [
    { query: 'laptop bag backpack', label: 'a laptop bag', reason: 'Carrying it loose between blocks is how screens crack.' },
    { query: 'wireless mouse', label: 'a mouse', reason: 'A trackpad is painful for long assignment sessions.' },
    { query: 'laptop charger adapter', label: 'a laptop charger', reason: 'Second-hand laptops often come without the brick.' },
    { query: 'cooling pad laptop stand', label: 'a cooling pad', reason: 'Hostel rooms in summer are hard on a laptop.' },
    { query: 'external hard disk pendrive', label: 'storage', reason: 'Somewhere to put project files.' },
  ],
  cycle: [
    { query: 'cycle lock chain lock', label: 'a cycle lock', reason: 'Campus cycle theft is opportunistic — a lock ends it.' },
    { query: 'helmet', label: 'a helmet', reason: 'Worth having before you need it.' },
    { query: 'cycle pump air pump', label: 'a pump', reason: 'A flat on a Sunday with no shop open.' },
  ],
  scooty: [
    { query: 'helmet', label: 'a helmet', reason: 'Required, and a fine if you are caught without one.' },
    { query: 'cycle lock chain lock', label: 'a cycle lock', reason: 'Parking overnight outside the hostel.' },
  ],
  table: [
    { query: 'study chair', label: 'a chair', reason: 'A table without a chair is half a desk.' },
    { query: 'study lamp table lamp', label: 'a study lamp', reason: 'Hostel ceiling lights are not enough to read by.' },
    { query: 'extension board spike guard', label: 'an extension board', reason: 'One wall socket, several things to plug in.' },
  ],
  chair: [
    { query: 'study table desk', label: 'a study table', reason: 'The other half.' },
    { query: 'study lamp table lamp', label: 'a study lamp', reason: 'For reading after lights-out.' },
  ],
  bed: [
    { query: 'mattress', label: 'a mattress', reason: 'Frames are often sold bare.' },
    { query: 'mosquito net', label: 'a mosquito net', reason: 'Standard issue for a ground-floor room.' },
  ],
  monitor: [
    { query: 'hdmi cable', label: 'an HDMI cable', reason: 'Almost never included.' },
    { query: 'keyboard', label: 'a keyboard', reason: 'A second screen usually means a proper desk setup.' },
    { query: 'wireless mouse', label: 'a mouse', reason: 'Same.' },
  ],
  keyboard: [{ query: 'wireless mouse', label: 'a mouse', reason: 'They are bought as a pair.' }],
  guitar: [{ query: 'guitar bag case', label: 'a guitar bag', reason: 'Guitars get carried to every event.' }],
  book: [
    { query: 'handwritten notes', label: 'notes', reason: 'The previous year’s notes go with the previous year’s book.' },
    { query: 'scientific calculator', label: 'a calculator', reason: 'Most core courses need one.' },
  ],
  gate: [{ query: 'handwritten notes', label: 'notes', reason: 'Somebody has already condensed it.' }],
  drafter: [{ query: 'drawing sheet drawing board', label: 'a drawing board', reason: 'A drafter needs something to sit on.' }],
  labequipment: [
    { query: 'lab coat apron', label: 'a lab coat', reason: 'No coat, no lab.' },
    { query: 'safety goggles', label: 'goggles', reason: 'Checked at the door in most labs.' },
  ],
  labcoat: [{ query: 'safety goggles', label: 'goggles', reason: 'The other half of the lab kit.' }],
  badminton: [{ query: 'shuttlecock', label: 'shuttles', reason: 'They run out fast.' }],
  cricket: [{ query: 'cricket ball pads', label: 'a ball and pads', reason: 'A bat alone is not a game.' }],
  gym: [{ query: 'yoga mat', label: 'a yoga mat', reason: 'Floors in the hostel gym are concrete.' }],
  induction: [{ query: 'utensils cookware', label: 'utensils', reason: 'Induction needs flat-bottomed pans.' }],
  kettle: [{ query: 'extension board spike guard', label: 'an extension board', reason: 'Rarely a socket where you want the kettle.' }],
  fridge: [{ query: 'extension board spike guard', label: 'an extension board', reason: 'Fridges want their own socket.' }],
  heater: [{ query: 'extension board spike guard', label: 'an extension board', reason: 'High-draw appliance, short cable.' }],
  luggage: [{ query: 'number lock', label: 'a lock', reason: 'For the train home.' }],
};

/**
 * What might go with this listing, best-known first.
 *
 * Reads the listing's own words, so it works on any listing without anyone
 * having to categorise it — the concepts come from the same vocabulary the
 * matchers use.
 *
 * @returns {Array<{ query: string, reason: string, from: string }>}
 */
const companionsFor = (listing, limit = 4) => {
  const concepts = conceptsOf(listing.title, listing.description);
  const out = [];
  const seen = new Set();

  for (const concept of concepts) {
    for (const item of COMPANIONS[concept] || []) {
      if (seen.has(item.query)) continue;
      seen.add(item.query);
      out.push({ ...item, from: concept });
      if (out.length >= limit) return out;
    }
  }

  return out;
};

module.exports = { companionsFor, COMPANIONS };
