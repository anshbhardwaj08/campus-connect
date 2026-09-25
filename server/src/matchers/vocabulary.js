// The campus vocabulary, and the one pure function that uses it.
//
// Why this exists: a wanted post and the listing that answers it almost never
// share a word. Somebody asks for "a cycle" and somebody else is selling a
// "Hercules Roadeo 26in gear bike". The string "cycle" appears nowhere in
// that listing, so no amount of regex tuning finds it — and `$text`, which
// savedSearch.service.js uses, matches whole words only, so it does no
// better.
//
// The fix here is unglamorous and deliberate: a hand-written list of what
// students on this campus actually call things. It is worth knowing WHY this
// beats embeddings for now. A college marketplace has a small, stable
// vocabulary — perhaps forty kinds of thing — and for a fixed vocabulary a
// list somebody wrote is more accurate than a general-purpose model, costs
// nothing, needs no API key, adds no latency, and cannot stop working
// because a key expired. What it cannot do is handle a word nobody thought
// of, and that is exactly when to swap in the semantic matcher behind
// matchers/index.js. Keep this list; it stays useful as a test fixture for
// whatever replaces it.
//
// Rules for editing:
//   * A concept is what students would call the THING, not the category.
//   * Put brand names in. On a campus, "Casio" means calculator and
//     "Hercules" means cycle, and that is most of the value here.
//   * Leave genuinely ambiguous words OUT. "notebook" is a paper notebook
//     far more often than a laptop, and "keyboard" is a computer keyboard
//     far more often than a piano. A wrong synonym is worse than a missing
//     one: it notifies the wrong person, and they stop trusting the alerts.

// concept -> everything a student might type for it. The concept key itself
// counts as an alias; no need to repeat it.
const CONCEPTS = {
  // --- getting around ---
  cycle: ['bicycle', 'bike', 'cycling', 'hercules', 'roadeo', 'btwin', 'firefox', 'avon', 'mtb', 'gear cycle', 'geared cycle'],
  helmet: [],
  scooty: ['scooter', 'activa', 'moped'],

  // --- the room ---
  table: ['desk', 'study table', 'study desk', 'writing table', 'computer table'],
  chair: ['stool', 'study chair', 'office chair', 'revolving chair'],
  bed: ['cot', 'mattress', 'gadda', 'folding bed'],
  almirah: ['cupboard', 'wardrobe', 'storage rack', 'shoe rack', 'rack'],
  fan: ['table fan', 'pedestal fan', 'wall fan'],
  cooler: ['air cooler', 'desert cooler'],
  heater: ['room heater', 'blower'],
  geyser: ['water heater', 'immersion rod', 'immersion heater'],
  iron: ['clothes iron', 'steam iron', 'press'],
  bucket: ['mug', 'balti'],
  curtain: ['curtains', 'blinds'],
  lamp: ['table lamp', 'study lamp', 'desk lamp', 'night lamp'],

  // --- kitchen ---
  kettle: ['electric kettle'],
  induction: ['induction cooktop', 'induction stove', 'hot plate'],
  fridge: ['refrigerator', 'mini fridge'],
  microwave: ['oven', 'otg'],
  utensils: ['bartan', 'plates', 'cookware', 'tiffin', 'lunch box'],
  bottle: ['water bottle', 'sipper', 'flask'],

  // --- computing ---
  laptop: ['macbook', 'thinkpad', 'ideapad', 'inspiron', 'vostro', 'pavilion', 'chromebook', 'ultrabook'],
  monitor: ['display', 'led monitor', 'lcd monitor', 'second screen'],
  mouse: ['wireless mouse', 'gaming mouse'],
  keyboard: ['mechanical keyboard', 'wireless keyboard'],
  printer: ['scanner'],
  storage: ['pendrive', 'pen drive', 'usb drive', 'flash drive', 'hard disk', 'harddisk', 'hdd', 'ssd', 'external drive', 'memory card', 'sd card'],
  charger: ['adapter', 'power brick', 'type c charger', 'laptop charger'],
  powerbank: ['power bank'],
  router: ['wifi router', 'dongle'],

  // --- audio / phone ---
  phone: ['mobile', 'smartphone', 'iphone', 'redmi', 'oneplus', 'realme', 'poco', 'samsung galaxy'],
  headphones: ['headphone', 'earphones', 'earphone', 'earbuds', 'buds', 'airpods', 'headset', 'neckband'],
  speaker: ['bluetooth speaker', 'soundbar', 'boombox'],

  // --- study ---
  book: ['books', 'textbook', 'textbooks', 'reference book', 'guide'],
  notes: ['handwritten notes', 'xerox', 'photocopy', 'class notes'],
  gate: ['gate prep', 'gate material', 'made easy', 'ace academy', 'postal study material', 'gate book'],
  calculator: ['calci', 'casio', 'fx991', 'fx 991', 'scientific calculator'],
  drafter: ['mini drafter', 'drawing board', 'drafting board', 'drawing sheet'],
  stationery: ['geometry box', 'instrument box', 'register', 'file', 'clipboard'],

  // --- lab ---
  labcoat: ['lab coat', 'apron', 'lab apron', 'white coat'],
  labequipment: ['multimeter', 'breadboard', 'bread board', 'arduino', 'raspberry pi', 'soldering iron', 'oscilloscope', 'lab manual', 'component kit'],
  goggles: ['safety goggles', 'lab goggles'],

  // --- sport ---
  cricket: ['cricket bat', 'cricket kit', 'pads', 'cricket ball'],
  badminton: ['racket', 'racquet', 'shuttle', 'shuttlecock', 'yonex'],
  football: ['soccer', 'soccer ball', 'football boots'],
  gym: ['dumbbell', 'dumbbells', 'weights', 'gym equipment', 'skipping rope', 'yoga mat'],
  tabletennis: ['table tennis', 'tt bat', 'ping pong'],

  // --- carried ---
  bag: ['backpack', 'rucksack', 'laptop bag', 'sling bag'],
  luggage: ['suitcase', 'trolley', 'trolly', 'travel bag', 'duffle'],
  shoes: ['sneakers', 'sports shoes', 'running shoes', 'spikes', 'cleats', 'formal shoes'],

  // --- worn ---
  jacket: ['hoodie', 'sweatshirt', 'windcheater', 'sweater'],
  blazer: ['suit', 'formals', 'formal shirt'],
  jersey: ['team jersey', 'sports jersey'],

  // --- music ---
  guitar: ['acoustic guitar', 'electric guitar', 'ukulele'],
  piano: ['synth', 'synthesizer', 'casio keyboard'],
  drums: ['cajon', 'djembe', 'tabla'],

  // --- other ---
  ticket: ['tickets', 'pass', 'passes', 'entry pass'],
  cyclelock: ['cycle lock', 'chain lock', 'number lock'],

  // --- the things that go WITH other things ---------------------------
  // Added for the cross-sell in matchers/companions.js. Deliberately no
  // bare 'case' or 'cover': a guitar case and a pillow cover are not phone
  // accessories, and one wrong synonym is worse than a missing one.
  phonecase: ['phone case', 'mobile case', 'phone cover', 'mobile cover', 'back cover', 'flip cover'],
  screenguard: ['screen guard', 'screen protector', 'tempered glass'],
  cable: ['usb cable', 'charging cable', 'data cable', 'type c cable', 'aux cable', 'hdmi cable'],
  pump: ['cycle pump', 'air pump', 'tyre pump', 'foot pump'],
  coolingpad: ['cooling pad', 'laptop cooler', 'laptop stand'],
  extension: ['extension board', 'extension cord', 'power strip', 'spike guard'],
  mosquitonet: ['mosquito net', 'net'],
};

// Words that carry no information about WHAT is wanted. Without these,
// "need a good cheap table urgently" would match anything described as good,
// cheap or urgent — which is most listings.
const STOPWORDS = new Set([
  'need', 'needed', 'want', 'wanted', 'wanting', 'looking', 'look', 'searching', 'search',
  'buy', 'buying', 'purchase', 'sell', 'selling', 'sale', 'rent', 'renting',
  'for', 'and', 'the', 'any', 'one', 'two', 'with', 'without', 'from', 'this', 'that',
  'some', 'anyone', 'someone', 'please', 'plz', 'pls', 'asap', 'urgent', 'urgently',
  'good', 'best', 'nice', 'great', 'cheap', 'cheapest', 'affordable', 'reasonable',
  'new', 'old', 'used', 'second', 'hand', 'condition', 'working', 'spare', 'extra',
  'college', 'campus', 'hostel', 'room', 'semester', 'sem', 'year',
  'price', 'rate', 'cost', 'budget', 'rupees', 'rs', 'inr',
  'have', 'has', 'get', 'got', 'give', 'take', 'also', 'only', 'just', 'must',
  'can', 'will', 'would', 'should', 'anybody', 'somebody', 'available',
  // Two-letter joining words. Short enough to survive the length check
  // below, and without these "need it to be in my room" contributes four
  // concepts of pure noise.
  'to', 'on', 'in', 'at', 'of', 'is', 'it', 'be', 'by', 'or', 'as', 'an',
  'my', 'me', 'we', 'us', 'do', 'so', 'if', 'up', 'no',
]);

// alias -> concept, built once. Split by whether the alias is a phrase,
// because phrases have to be matched before the text is torn into words.
const SINGLE = new Map();
const PHRASES = [];

for (const [concept, aliases] of Object.entries(CONCEPTS)) {
  for (const alias of [concept, ...aliases]) {
    if (alias.includes(' ')) PHRASES.push({ concept, alias });
    else SINGLE.set(alias, concept);
  }
}
// Longest phrase first: "gear cycle" must win over nothing, and "table
// tennis" must be consumed before "table" is seen as a piece of furniture.
PHRASES.sort((a, b) => b.alias.length - a.alias.length);

const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Crude, and crude is right: a real stemmer would turn "gas" into "ga" and
// "lens" into "len". This only strips a trailing s from a word long enough
// to survive it, which covers posters/notes/cycles and little else.
const singular = (word) =>
  word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;

/**
 * Turns free text into the set of things it is about.
 *
 * Unknown words are kept as themselves rather than dropped, so this never
 * does WORSE than plain word overlap — "Cengel thermodynamics" still matches
 * "thermodynamics by Cengel" even though neither word is in the vocabulary
 * above. The list only ever adds matches.
 */
const conceptsOf = (...texts) => {
  let text = ` ${normalize(texts.join(' '))} `;
  const found = new Set();

  for (const { concept, alias } of PHRASES) {
    if (text.includes(` ${alias} `)) {
      found.add(concept);
      // Removed so its words are not also counted on their own: "table
      // tennis" is one thing, not a table and some tennis.
      text = text.split(` ${alias} `).join(' ');
    }
  }

  for (const raw of text.trim().split(' ')) {
    if (!raw || raw.length < 2 || STOPWORDS.has(raw)) continue;
    const word = singular(raw);
    if (STOPWORDS.has(word)) continue;
    found.add(SINGLE.get(raw) || SINGLE.get(word) || word);
  }

  return found;
};

module.exports = { conceptsOf, CONCEPTS, STOPWORDS };
