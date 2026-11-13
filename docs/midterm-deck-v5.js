// Campus Connect — mid-term evaluation deck, v4.
//
// Ten slides, 8 minutes + ~2 for Q&A, against the panel's three criteria:
//   C1 technical clarity · C2 implementation detail · C3 own module
//
// Visual system
//   · Cambria for headlines against Calibri for body — the serif/sans pair
//     is what stops a deck reading as a default template.
//   · A numbered eyebrow (01 · THE PROBLEM) on every content slide. One
//     repeated device, carrying real information: where you are in the talk.
//   · A colour per module, used consistently wherever that module appears —
//     the progress matrix, the methodology flow, the architecture. Colour as
//     an index, not decoration.
//   · Light slides throughout, with two dark ones (progress, conclusion) for
//     rhythm. Screenshots sit on white without fighting it.

const path = require('path');
const pptxgen = require('pptxgenjs');

const IMG = process.env.DECK_IMG || path.join(__dirname, 'midterm-assets');

// --- tokens ---------------------------------------------------------------
const NAVY = '12263A';   // ink, and the dark ground
const TEAL = '0E7C86';   // the one accent
const TEAL_DK = '0A5C64';
const TEAL_LT = 'E4F1F2';
const BLUE = '2E5EAA';
const BLUE_LT = 'E9EEF8';
const GREEN = '2F7D4F';
const GREEN_LT = 'E7F2EB';
const AMBER = 'B86A00';
const AMBER_LT = 'FFF4DF';
const RED = '9E3535';
const RED_LT = 'FBEFEF';
const PANEL = 'F4F7FA';
const RULE = 'D7DEE6';
const GREY = '56657A';
const GREY_LT = '8A95A5';
const WHITE = 'FFFFFF';
const ICE = 'B9CCDD';
const MINT = '7FD1D8';

const THEME = {
  name: 'Campus Connect',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: NAVY, lt1: WHITE, dk2: GREY, lt2: PANEL,
    accent1: TEAL, accent2: BLUE, accent3: GREEN,
    accent4: AMBER, accent5: NAVY, accent6: RED,
    hlink: TEAL, folHlink: GREY,
  },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = 'Campus Connect team';
pres.title = 'Campus Connect — Mid-Term Evaluation';

// --- layouts --------------------------------------------------------------
// A placeholder is { placeholder: { options: { name, type, ... } } }. Written
// as { text: { options: { placeholder } } } it silently becomes an ordinary
// text box and the filled text lands at the origin at default size.
const ph = (name, type, o) => ({ placeholder: { options: { name, type, ...o }, text: '' } });

pres.defineSlideMaster({
  title: 'TITLE_DARK',
  background: { color: NAVY },
  objects: [
    ph('title', 'title', { x: 0.75, y: 1.95, w: 7.0, h: 1.2, fontSize: 52, bold: true, color: WHITE, align: 'left', valign: 'bottom' }),
    ph('subtitle', 'body', { x: 0.75, y: 3.3, w: 6.6, h: 1.3, fontSize: 17, color: ICE, align: 'left', valign: 'top' }),
    ph('meta', 'body', { x: 0.75, y: 4.95, w: 6.9, h: 1.6, fontSize: 13, color: ICE, align: 'left', valign: 'top' }),
  ],
});

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: WHITE },
  objects: [
    ph('eyebrow', 'body', { x: 0.6, y: 0.34, w: 8, h: 0.26, fontSize: 10.5, bold: true, color: TEAL, charSpacing: 2, align: 'left', valign: 'middle' }),
    ph('title', 'title', { x: 0.6, y: 0.62, w: 12.13, h: 0.62, fontSize: 31, bold: true, color: NAVY, align: 'left', valign: 'middle' }),
    ph('kicker', 'body', { x: 0.6, y: 1.24, w: 12.13, h: 0.34, fontSize: 13.5, color: GREY, align: 'left', valign: 'middle' }),
    { text: { text: 'Campus Connect  ·  Mid-term evaluation', options: { x: 0.6, y: 7.08, w: 6, h: 0.28, fontSize: 10, color: GREY_LT, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.08, w: 0.43, h: 0.28, color: GREY_LT, fontSize: 10, align: 'right' },
});

pres.defineSlideMaster({
  title: 'CONTENT_DARK',
  background: { color: NAVY },
  objects: [
    ph('eyebrow', 'body', { x: 0.6, y: 0.34, w: 8, h: 0.26, fontSize: 10.5, bold: true, color: MINT, charSpacing: 2, align: 'left', valign: 'middle' }),
    ph('title', 'title', { x: 0.6, y: 0.62, w: 12.13, h: 0.62, fontSize: 31, bold: true, color: WHITE, align: 'left', valign: 'middle' }),
    ph('kicker', 'body', { x: 0.6, y: 1.24, w: 12.13, h: 0.34, fontSize: 13.5, color: ICE, align: 'left', valign: 'middle' }),
    { text: { text: 'Campus Connect  ·  Mid-term evaluation', options: { x: 0.6, y: 7.08, w: 6, h: 0.28, fontSize: 10, color: '64809B', margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.08, w: 0.43, h: 0.28, color: '64809B', fontSize: 10, align: 'right' },
});

const SEC = { open: 'Opening', system: 'System', build: 'Build and results', close: 'Outlook' };
Object.values(SEC).forEach((title) => pres.addSection({ title }));

// --- helpers --------------------------------------------------------------
const card = (s, { x, y, w, h, fill = PANEL, line = RULE, width = 1, name }) =>
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: fill }, line: { color: line, width }, objectName: name,
  });

const frame = (s, { x, y, w, h, line = RULE, width = 1 }) =>
  s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: WHITE, transparency: 100 }, line: { color: line, width } });

const tag = (s, text, { x, y, w, color = GREY, size = 9.5 }) =>
  s.addText(text, { x, y, w, h: 0.24, isTextBox: true, margin: 0, fontSize: size, bold: true, color, charSpacing: 1.4, valign: 'middle' });

const chip = (s, { x, y, size = 0.42, text, fill = TEAL, color = WHITE, fontSize = 14 }) => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w: size, h: size, rectRadius: 0.06, fill: { color: fill }, line: { color: fill, width: 0.5 } });
  s.addText(String(text), { x, y, w: size, h: size, isTextBox: true, margin: 0, align: 'center', valign: 'middle', fontSize, bold: true, color });
};

const down = (s, x, y1, y2, color = GREY_LT) =>
  s.addShape(pres.ShapeType.line, { x, y: y1, w: 0, h: y2 - y1, line: { color, width: 1.5, endArrowType: 'triangle' } });

const right = (s, x1, x2, y, color = GREY_LT) =>
  s.addShape(pres.ShapeType.line, { x: x1, y, w: x2 - x1, h: 0, line: { color, width: 1.5, endArrowType: 'triangle' } });

const sized = (file, wPx, hPx, { x, y, w, h, top = false }) => {
  const k = Math.min(w / wPx, h / hPx);
  const iw = wPx * k;
  const ih = hPx * k;
  return { path: path.join(IMG, file), x: x + (w - iw) / 2, y: top ? y : y + (h - ih) / 2, w: iw, h: ih };
};

// =========================================================== 1. TITLE
{
  const s = pres.addSlide({ masterName: 'TITLE_DARK', sectionTitle: SEC.open });

  // An inset panel rather than a full bleed: at full height the screenshot
  // ran off the top edge and left the bottom-right corner empty.
  const shot = { path: path.join(IMG, 'site_signin.png'), x: 6.62, y: 1.24, w: 6.1, h: 3.19 };
  s.addImage(shot);
  frame(s, { ...shot, line: '3E5873', width: 1.25 });

  s.addShape(pres.ShapeType.roundRect, { x: 0.75, y: 0.62, w: 2.85, h: 0.4, rectRadius: 0.06, fill: { color: TEAL }, line: { color: TEAL, width: 0.5 } });
  s.addText('MID-TERM EVALUATION', { x: 0.75, y: 0.62, w: 2.85, h: 0.4, isTextBox: true, margin: 0, align: 'center', valign: 'middle', fontSize: 10.5, bold: true, color: WHITE, charSpacing: 1.8 });

  s.addText('Campus', { x: 0.75, y: 1.24, w: 5.4, h: 0.86, isTextBox: true, margin: 0, fontSize: 52, bold: true, color: WHITE, fontFace: 'Cambria', valign: 'bottom' });
  s.addText('Connect', { x: 0.75, y: 2.0, w: 5.4, h: 0.86, isTextBox: true, margin: 0, fontSize: 52, bold: true, color: MINT, fontFace: 'Cambria', valign: 'bottom' });

  s.addShape(pres.ShapeType.rect, { x: 0.78, y: 2.98, w: 0.9, h: 0.045, fill: { color: TEAL }, line: { color: TEAL, width: 0.5 } });
  s.addText('A marketplace only your own campus can enter — with semantic matching and retrieval-augmented recommendations.', { x: 0.75, y: 3.2, w: 5.3, h: 1.0, isTextBox: true, margin: 0, fontSize: 14.5, color: ICE, valign: 'top' });

  // three figures, so the opening slide already says something
  const facts = [['4', 'modules built'], ['399', 'tests passing'], ['Live', 'on Render']];
  facts.forEach(([n, l], i) => {
    const x = 6.62 + i * 2.06;
    s.addText(n, { x, y: 4.62, w: 1.9, h: 0.52, isTextBox: true, margin: 0, fontSize: 28, bold: true, color: MINT, fontFace: 'Cambria', valign: 'middle' });
    s.addText(l, { x, y: 5.14, w: 1.9, h: 0.28, isTextBox: true, margin: 0, fontSize: 11.5, color: ICE, valign: 'middle' });
  });

  s.addShape(pres.ShapeType.rect, { x: 6.62, y: 5.72, w: 6.1, h: 0.5, fill: { color: '1B3350' }, line: { color: '1B3350', width: 0.5 } });
  s.addText('campus-connect-94sq.onrender.com', { x: 6.86, y: 5.72, w: 5.6, h: 0.5, isTextBox: true, margin: 0, fontSize: 14, bold: true, color: MINT, valign: 'middle' });

  s.addText(
    [
      { text: 'Team   ', options: { bold: true, color: WHITE } },
      { text: '[Student 1]  ·  [Student 2]  ·  [Student 3]  ·  [Student 4]  ·  [Student 5]', options: { color: ICE, breakLine: true } },
      { text: 'Mentors   ', options: { bold: true, color: WHITE } },
      { text: '[Mentor 1]  ·  [Mentor 2]', options: { color: ICE, breakLine: true } },
      { text: 'Group   ', options: { bold: true, color: WHITE } },
      { text: '[no.]    Session [2026–27]', options: { color: ICE, breakLine: true } },
      { text: 'Dept. of Computer Science & Engineering, PEC', options: { color: ICE } },
    ],
    { x: 0.75, y: 4.62, w: 5.5, h: 2.0, isTextBox: true, margin: 0, fontSize: 11.5, paraSpaceAfter: 6, valign: 'top' }
  );

  s.addNotes('[0:00-0:20] The screenshot is the sign-in page — lead with it: "the first thing the product does is refuse anyone without a college address." Then the three figures, then names and who owns which module.');
}

// =========================================================== 2. PROBLEM
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('01  ·  PROBLEM STATEMENT', { placeholder: 'eyebrow' });
  s.addText('Trading in a group chat', { placeholder: 'title' });
  s.addText('Four real posts from a hostel announcements channel — this is the system we are replacing', { placeholder: 'kicker' });

  const fails = [
    ['01', 'No identity guarantee', 'Anyone in the group, or a forward from outside it. Nothing says this is a PEC student.'],
    ['02', 'No search', 'Scroll and hope. Last week’s post is gone by Friday and the same question is asked again.'],
    ['03', 'No record', 'Who met whom, and for how much — nobody can tell afterwards, and messages get deleted.'],
  ];
  fails.forEach(([n, head, body], i) => {
    const y = 1.72 + i * 1.3;
    s.addText(n, { x: 0.6, y, w: 0.5, h: 0.3, isTextBox: true, margin: 0, fontSize: 13, bold: true, color: RED, fontFace: 'Cambria' });
    s.addText(head, { x: 1.12, y: y - 0.02, w: 3.3, h: 0.34, isTextBox: true, margin: 0, fontSize: 16, bold: true, color: NAVY, fontFace: 'Cambria' });
    s.addText(body, { x: 1.12, y: y + 0.34, w: 3.3, h: 0.82, isTextBox: true, margin: 0, fontSize: 12.5, color: GREY, valign: 'top' });
  });

  const phones = [
    ['wa1.png', 355, 721, 'No price, no condition — just a number to call'],
    ['wa2.png', 333, 685, 'A lost item buried under the next forward'],
    ['wa3.png', 331, 693, 'Lost and found has no “found” button'],
    ['wa4.png', 331, 691, 'Events drown in the same feed'],
  ];
  const H = 3.7;
  const colW = 1.92;
  phones.forEach(([file, w, h, cap], i) => {
    const cx = 4.78 + i * (colW + 0.12);
    const iw = (H * w) / h;
    const x = cx + (colW - iw) / 2;
    s.addImage({ path: path.join(IMG, file), x, y: 1.72, w: iw, h: H });
    frame(s, { x, y: 1.72, w: iw, h: H, line: RULE, width: 1 });
    s.addText(cap, { x: cx, y: 5.52, w: colW, h: 0.62, isTextBox: true, margin: 0, fontSize: 11, color: GREY, align: 'center', valign: 'top' });
  });

  card(s, { x: 0.6, y: 6.22, w: 12.13, h: 0.72, fill: TEAL_LT, line: TEAL });
  s.addText(
    [
      { text: 'The gap:  ', options: { bold: true, color: TEAL_DK } },
      { text: 'nothing combines verified college-only identity with structured matching — and keyword search fails campus vocabulary, where “cycle” never matches “Hercules bike”.', options: { color: NAVY } },
    ],
    { x: 0.88, y: 6.22, w: 11.6, h: 0.72, isTextBox: true, margin: 0, fontSize: 13, valign: 'middle' }
  );

  s.addNotes('[0:20-1:20] Point at the screenshots, not the bullets. "A sale is a forwarded photo and a number." Then the third phone: right under the lost guitar is "This message was deleted" — the record can vanish. Land on the gap line. Note: phone numbers are blurred on purpose.');
}

// =========================================================== 3. THE ANSWER
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.open });
  s.addText('02  ·  THE SOLUTION', { placeholder: 'eyebrow' });
  s.addText('One campus, one place', { placeholder: 'title' });
  s.addText('Everything the group chat could not do — structured, searchable, and tied to a verified name', { placeholder: 'kicker' });

  const cols = [
    { file: 'site_browse.png', w: 1900, h: 1000, head: 'Marketplace', colour: BLUE, tint: BLUE_LT,
      points: ['Price, condition and category on every card', 'Filter, sort and save a search for alerts', 'Buy or rent, with a deposit noted', 'Every seller is a verified student'] },
    { file: 'site_lf.png', w: 1918, h: 895, head: 'Community', colour: GREEN, tint: GREEN_LT,
      points: ['Lost & Found, Carpool, Wanted and Events', '“I have seen it” opens a chat with the owner', 'Their confirmation closes the post', 'Carpool seats go down automatically'] },
    { file: 'site_events.png', w: 1290, h: 790, head: 'Events and trust', colour: TEAL, tint: TEAL_LT,
      points: ['A dated board with spots left', 'RSVPs count people, not taps', 'A 6-digit code closes a deal at the gate', 'Reviews build a visible trust score'] },
  ];

  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.115;
    const img = sized(c.file, c.w, c.h, { x, y: 1.68, w: 3.9, h: 2.3, top: true });
    s.addImage(img);
    frame(s, { ...img, line: RULE, width: 1 });

    s.addShape(pres.ShapeType.rect, { x, y: 4.2, w: 3.9, h: 0.46, fill: { color: c.colour }, line: { color: c.colour, width: 0.5 } });
    s.addText(c.head, { x: x + 0.2, y: 4.2, w: 3.5, h: 0.46, isTextBox: true, margin: 0, fontSize: 16, bold: true, color: WHITE, fontFace: 'Cambria', valign: 'middle' });

    c.points.forEach((t, j) => {
      const y = 4.84 + j * 0.56;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.08, y: y + 0.09, w: 0.1, h: 0.1, fill: { color: c.colour }, line: { color: c.colour, width: 0.5 } });
      s.addText(t, { x: x + 0.32, y, w: 3.56, h: 0.52, isTextBox: true, margin: 0, fontSize: 12.5, color: NAVY, valign: 'top' });
    });
  });

  s.addNotes('[1:20-2:10] One sentence per column, then stop — the bullets are there to be read, not recited. The line worth saying out loud is the last one: a deal only closes when a code is swapped face to face and both sides confirm, which is the part a group chat can never do.');
}

// =========================================================== 4. ARCHITECTURE
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.system });
  s.addText('03  ·  ARCHITECTURE', { placeholder: 'eyebrow' });
  s.addText('How it is built', { placeholder: 'title' });
  s.addText('Three layers, read top to bottom: who uses it, what serves them, what it stores and calls', { placeholder: 'kicker' });

  // Simplified from the first cut: three numbered bands instead of six tiers
  // of boxes. Everything a panel asks about is still named, but the shape of
  // the system is legible from the back of the room.
  // The badge is sized to its longest title; the first cut used a fixed
  // 2.4" badge and the longer titles wrapped to three lines and spilled out
  // over the card edge.
  const layer = (n, y, h, title, fill, line, colour, bw = 3.25) => {
    card(s, { x: 0.6, y, w: 12.13, h, fill, line, width: 1.25 });
    s.addShape(pres.ShapeType.rect, { x: 0.6, y, w: bw, h: 0.34, fill: { color: colour }, line: { color: colour, width: 0.5 } });
    s.addText(`${n}   ${title}`, { x: 0.78, y, w: bw - 0.3, h: 0.34, isTextBox: true, margin: 0, fontSize: 10.5, bold: true, color: WHITE, charSpacing: 1.2, valign: 'middle' });
  };
  const inner = (x, y, w, h, head, body, colour) => {
    card(s, { x, y, w, h, fill: WHITE, line: RULE });
    s.addText(head, { x: x + 0.16, y: y + 0.07, w: w - 0.32, h: 0.28, isTextBox: true, margin: 0, fontSize: 13, bold: true, color: colour || NAVY, fontFace: 'Cambria', valign: 'top' });
    s.addText(body, { x: x + 0.16, y: y + 0.38, w: w - 0.32, h: h - 0.46, isTextBox: true, margin: 0, fontSize: 11.5, color: GREY, valign: 'top' });
  };

  // layer 1 — the people
  layer('01', 1.62, 1.12, 'WHO USES IT', BLUE_LT, BLUE, BLUE, 2.4);
  inner(0.82, 2.0, 3.74, 0.62, 'Student app', 'React 19 — browse, post, chat, deals, community', BLUE);
  inner(4.78, 2.0, 3.74, 0.62, 'Admin panel', 'React 19 — moderation, users, live dashboard', BLUE);
  inner(8.74, 2.0, 3.77, 0.62, 'Signed-out visitor', 'Can browse the board, but cannot message or buy', BLUE);

  down(s, 6.665, 2.74, 2.98, BLUE);
  s.addText('HTTPS REST  ·  httpOnly JWT cookie  ·  WebSocket for live chat', { x: 6.9, y: 2.74, w: 5.6, h: 0.24, isTextBox: true, margin: 0, fontSize: 10.5, color: GREY, valign: 'middle' });

  // layer 2 — the service
  layer('02', 3.0, 1.86, 'WHAT SERVES THEM', TEAL_LT, TEAL, TEAL, 2.9);
  s.addText('One Node.js service on Render. Every request passes the same six checks, in order.', { x: 3.62, y: 3.0, w: 8.9, h: 0.34, isTextBox: true, margin: 0, fontSize: 11, color: TEAL_DK, valign: 'middle' });
  const chain = ['Helmet + CORS', 'Rate limit', 'JWT verify', 'requireRole()', 'Joi validation', 'Controller'];
  const cw = 1.745;
  const cg = 0.26;
  chain.forEach((t, i) => {
    const x = 0.78 + i * (cw + cg);
    card(s, { x, y: 3.46, w: cw, h: 0.4, fill: WHITE, line: TEAL });
    s.addText(t, { x, y: 3.46, w: cw, h: 0.4, isTextBox: true, margin: 0, fontSize: 11, bold: true, color: TEAL_DK, align: 'center', valign: 'middle' });
    if (i < chain.length - 1) right(s, x + cw + 0.02, x + cw + cg - 0.02, 3.66, TEAL);
  });
  inner(0.82, 3.98, 5.86, 0.74, 'REST API  ·  17 route groups, 104 endpoints', 'Controller → service → model, the same shape every time', TEAL_DK);
  inner(6.86, 3.98, 5.65, 0.74, 'Socket.io gateway', 'Membership re-checked on every event, not just at connect', TEAL_DK);

  down(s, 6.665, 4.86, 5.08, GREY_LT);

  // layer 3 — what it talks to
  layer('03', 5.08, 1.72, 'WHAT IT TALKS TO', PANEL, RULE, NAVY, 2.7);
  const w3 = 2.86;
  const g3 = 0.225;
  const items = [
    ['MongoDB Atlas', '16 collections. Vectors and suggestions cached on the rows.', NAVY],
    ['Gemini API', 'Embeddings and cross-sell picks. Called from a job, never a page.', AMBER],
    ['Bull on Redis', '6 scheduled jobs. A Redis outage cannot take the API down.', GREEN],
    ['Cloudinary · mail · SMS', 'Images, verification email, phone OTP.', BLUE],
  ];
  items.forEach(([h, b, c], i) => inner(0.82 + i * (w3 + g3), 5.5, w3, 1.12, h, b, c));

  s.addText('One Render web service in Singapore serves the API, the sockets and both apps from the same origin — which is why the login cookie works without a custom domain.', { x: 0.6, y: 6.88, w: 12.13, h: 0.24, isTextBox: true, margin: 0, fontSize: 10.5, color: GREY, valign: 'middle' });

  s.addNotes('[2:10-3:10] The C1 slide. Three layers, one sentence each: who uses it, what serves them, what it stores. The two lines worth saying out loud: every request passes the same six checks in the same order, and the amber box is reached from a timer, never from a page load — so nothing a student clicks ever waits on a model.');
}

// =========================================================== 5. PROGRESS MATRIX
{
  const s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: SEC.system });
  s.addText('04  ·  PROGRESS', { placeholder: 'eyebrow' });
  s.addText('Where each module stands', { placeholder: 'title' });
  s.addText('Three modules complete and in use; three more in progress or scheduled', { placeholder: 'kicker' });

  const stages = ['Designed', 'Built', 'Tested', 'Deployed', 'Tuned'];
  const colX = [5.3, 6.5, 7.7, 8.9, 10.1];
  const colW = 1.05;
  const stX = 11.35;

  stages.forEach((t, i) => s.addText(t, { x: colX[i], y: 1.84, w: colW, h: 0.3, isTextBox: true, margin: 0, fontSize: 11.5, color: ICE, align: 'center', valign: 'middle' }));
  s.addText('MODULE', { x: 0.65, y: 1.84, w: 3, h: 0.3, isTextBox: true, margin: 0, fontSize: 10, bold: true, color: MINT, charSpacing: 2, valign: 'middle' });
  s.addText('STATUS', { x: stX, y: 1.84, w: 1.4, h: 0.3, isTextBox: true, margin: 0, fontSize: 10, bold: true, color: MINT, charSpacing: 2, align: 'center', valign: 'middle' });
  s.addShape(pres.ShapeType.line, { x: 0.6, y: 2.2, w: 12.13, h: 0, line: { color: '31506F', width: 1 } });

  // Status is spelled out as well as dotted: four filled circles read as
  // "done" at a glance, and module 4 is explicitly not.
  const DONE = 'Completed';
  const GOING = 'Ongoing';
  const PLAN = 'Planned';
  const rows = [
    ['Authentication and verified identity', 'JWT cookies · email verification enforced · RBAC', TEAL, [1, 1, 1, 1, 1], DONE],
    ['Marketplace core', 'Listings, chat, offers, deal handshake, reviews', BLUE, [1, 1, 1, 1, 1], DONE],
    ['Community boards', 'Lost & Found, Carpool, Wanted, Events', GREEN, [1, 1, 1, 1, 1], DONE],
    ['AI retrieval and RAG', 'Built and measured — not yet tuned on real volume', AMBER, [1, 1, 1, 1, 0], GOING],
    ['Semantic search on Browse', 'Today Browse is keyword-only', GREY_LT, [1, 0, 0, 0, 0], PLAN],
    ['Installable app (PWA)', 'Then a Capacitor build', GREY_LT, [1, 0, 0, 0, 0], PLAN],
  ];

  rows.forEach(([name, sub, colour, dots, status], i) => {
    const y = 2.28 + i * 0.68;
    const planned = status === PLAN;
    s.addShape(pres.ShapeType.rect, { x: 0.6, y: y + 0.62, w: 12.13, h: 0, line: { color: '2A4663', width: 0.75 }, fill: { color: NAVY } });
    s.addShape(pres.ShapeType.rect, { x: 0.6, y: y + 0.06, w: 0.06, h: 0.44, fill: { color: colour }, line: { color: colour, width: 0.5 } });
    s.addText(name, { x: 0.86, y: y + 0.02, w: 4.3, h: 0.3, isTextBox: true, margin: 0, fontSize: 13.5, bold: true, color: planned ? ICE : WHITE, valign: 'middle' });
    s.addText(sub, { x: 0.86, y: y + 0.3, w: 4.4, h: 0.26, isTextBox: true, margin: 0, fontSize: 10.5, color: '8FA6BE', valign: 'middle' });

    dots.forEach((on, j) => {
      const cx = colX[j] + colW / 2 - 0.115;
      const fill = colour === GREY_LT ? MINT : colour;
      s.addShape(pres.ShapeType.ellipse, {
        x: cx, y: y + 0.17, w: 0.23, h: 0.23,
        fill: on ? { color: fill } : { color: NAVY },
        line: { color: on ? fill : '4A6684', width: 1.5 },
      });
    });

    const pill = status === DONE ? TEAL : status === GOING ? AMBER : '3C5675';
    s.addShape(pres.ShapeType.roundRect, { x: stX, y: y + 0.14, w: 1.38, h: 0.3, rectRadius: 0.06, fill: { color: status === DONE ? pill : NAVY }, line: { color: pill, width: 1.25 } });
    s.addText(status.toUpperCase(), { x: stX, y: y + 0.14, w: 1.38, h: 0.3, isTextBox: true, margin: 0, align: 'center', valign: 'middle', fontSize: 9.5, bold: true, color: status === DONE ? WHITE : pill === '3C5675' ? ICE : pill, charSpacing: 0.8 });
  });

  s.addShape(pres.ShapeType.ellipse, { x: 0.62, y: 6.5, w: 0.2, h: 0.2, fill: { color: MINT }, line: { color: MINT, width: 1.5 } });
  s.addText('Completed', { x: 0.92, y: 6.44, w: 1.4, h: 0.3, isTextBox: true, margin: 0, fontSize: 12, color: ICE, valign: 'middle' });
  s.addShape(pres.ShapeType.ellipse, { x: 2.3, y: 6.5, w: 0.2, h: 0.2, fill: { color: NAVY }, line: { color: '4A6684', width: 1.5 } });
  s.addText('Not yet', { x: 2.6, y: 6.44, w: 1.4, h: 0.3, isTextBox: true, margin: 0, fontSize: 12, color: ICE, valign: 'middle' });

  s.addText('“Tuned” means calibrated against real campus volume — the one box still open on module 4, and why it is reported as ongoing rather than finished.', { x: 4.1, y: 6.44, w: 8.63, h: 0.3, isTextBox: true, margin: 0, fontSize: 11, color: '8FA6BE', align: 'right', valign: 'middle' });

  s.addNotes('[3:10-3:55] Read the status column: three complete, one ongoing, two planned. The single open circle is module 4 under "Tuned" — the matcher is built, deployed and measured, but on a small board, which is exactly why the performa reports it as ongoing. The last two rows are the roadmap.');
}

// =========================================================== 6. METHODOLOGY FLOW
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.system });
  s.addText('05  ·  PROPOSED SYSTEM', { placeholder: 'eyebrow' });
  s.addText('How a request flows', { placeholder: 'title' });
  s.addText('Every input passes one gate, is handled by one module, and is written to one store', { placeholder: 'kicker' });

  const band = (y, h, x, w, fill, line, head, body, hc) => {
    card(s, { x, y, w, h, fill, line });
    s.addText(
      [{ text: head + '   ', options: { bold: true, color: hc || NAVY } }, { text: body, options: { color: GREY } }],
      { x: x + 0.18, y, w: w - 0.36, h, isTextBox: true, margin: 0, fontSize: 11.5, align: 'center', valign: 'middle' }
    );
  };

  band(1.58, 0.38, 3.3, 6.73, PANEL, RULE, 'Student or visitor', 'signed in with a verified @pec.edu.in address');
  down(s, 6.665, 1.96, 2.08);

  band(2.08, 0.38, 2.3, 8.73, PANEL, RULE, 'Input', 'listing and photos · message and offer · wanted post, ride, lost item · event');
  down(s, 6.665, 2.46, 2.58);

  band(2.58, 0.38, 2.3, 8.73, TEAL_LT, TEAL, 'Validation and authorisation', 'Joi schema · JWT cookie · requireRole() · rate limit', TEAL_DK);

  // fan out to the four modules
  const mw = 2.86;
  const mg = 0.225;
  const mx = [0.6, 0.6 + mw + mg, 0.6 + 2 * (mw + mg), 0.6 + 3 * (mw + mg)];
  const my = 3.18;
  const mh = 2.52;
  const cx = mx.map((x) => x + mw / 2);
  down(s, 6.665, 2.96, 3.06);
  s.addShape(pres.ShapeType.line, { x: cx[0], y: 3.06, w: cx[3] - cx[0], h: 0, line: { color: GREY_LT, width: 1.5 } });
  cx.forEach((x) => down(s, x, 3.06, my));

  const modules = [
    { n: '1', name: 'Identity', colour: TEAL,
      input: 'College email, password', proc: 'Verify link → JWT cookie → role check on every route', out: 'A verified session, or a refusal' },
    { n: '2', name: 'Marketplace', colour: BLUE,
      input: 'Listing, message, offer', proc: 'Chat → offer → accept → 6-digit code → both confirm', out: 'Sold listing, review, trust score' },
    { n: '3', name: 'Community', colour: GREEN,
      input: 'Ride, lost item, wanted post, event', proc: 'Someone asks in the thread → the owner confirms', out: 'Seats decremented, post closed' },
    { n: '4', name: 'AI retrieval', colour: AMBER,
      input: 'Wanted post, listing text', proc: 'Embed 768-d → cosine ≥ 0.66 · RAG picks real listings', out: 'A notification, and “Goes with this”' },
  ];

  modules.forEach((m, i) => {
    const x = mx[i];
    card(s, { x, y: my, w: mw, h: mh, fill: WHITE, line: m.colour, width: 1.25 });
    s.addShape(pres.ShapeType.rect, { x, y: my, w: mw, h: 0.38, fill: { color: m.colour }, line: { color: m.colour, width: 0.5 } });
    s.addText(`${m.n}.  ${m.name}`, { x: x + 0.16, y: my, w: mw - 0.32, h: 0.38, isTextBox: true, margin: 0, fontSize: 13.5, bold: true, color: WHITE, fontFace: 'Cambria', valign: 'middle' });

    // three bands, each a label over its text; heights are set so the last
    // one finishes inside the card — the first cut had OUTPUT hanging below
    // the border with the dashed connector running through it.
    const bands = [['INPUT', m.input, 0.36], ['PROCESS', m.proc, 0.54], ['OUTPUT', m.out, 0.40]];
    let yy = my + 0.48;
    bands.forEach(([lab, txt, h]) => {
      tag(s, lab, { x: x + 0.16, y: yy, w: 1.4, color: m.colour, size: 8.5 });
      s.addText(txt, { x: x + 0.16, y: yy + 0.2, w: mw - 0.32, h, isTextBox: true, margin: 0, fontSize: 11, color: NAVY, valign: 'top' });
      yy += 0.2 + h + 0.03;
    });
  });

  // every module writes to one store: collect, then one arrow in
  const collectY = 5.78;
  cx.forEach((x) => s.addShape(pres.ShapeType.line, { x, y: my + mh, w: 0, h: collectY - (my + mh), line: { color: GREY_LT, width: 1.25, dashType: 'dash' } }));
  s.addShape(pres.ShapeType.line, { x: cx[0], y: collectY, w: cx[3] - cx[0], h: 0, line: { color: GREY_LT, width: 1.25, dashType: 'dash' } });
  down(s, 6.665, collectY, 5.94);

  s.addShape(pres.ShapeType.flowChartMagneticDisk, { x: 3.9, y: 5.94, w: 5.53, h: 0.46, fill: { color: NAVY }, line: { color: NAVY, width: 1 } });
  s.addText('MongoDB Atlas  ·  every input, state change and prediction is stored', { x: 3.9, y: 5.94, w: 5.53, h: 0.46, isTextBox: true, margin: 0, fontSize: 10.5, bold: true, color: WHITE, align: 'center', valign: 'middle' });

  down(s, 6.665, 6.40, 6.52);
  band(6.52, 0.38, 2.3, 8.73, PANEL, RULE, 'Back to the student', 'listings and filters · chat and deals · notifications · suggestions');

  s.addNotes('[3:55-4:45] Follow one input the whole way down. The wanted post is the best: it enters as text, passes the same gate as everything else, lands in module 4, becomes a 768-dimension vector, and comes back an hour later as a notification. Two points: every module writes to one store, and nothing here reaches a model on a request path.');
}

// =========================================================== 7. ADMIN
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.build });
  s.addText('06  ·  MODERATION', { placeholder: 'eyebrow' });
  s.addText('Who keeps it clean', { placeholder: 'title' });
  s.addText('A second React app, role-gated, where moderators see the marketplace as it stands right now', { placeholder: 'kicker' });

  const img = sized('site_admin.png', 1896, 996, { x: 0.6, y: 1.66, w: 7.65, h: 4.1, top: true });
  s.addImage(img);
  frame(s, { ...img, line: RULE, width: 1.25 });

  const points = [
    ['Live figures, not a nightly report', 'Users, active listings, completed deals and open reports update as the marketplace moves.'],
    ['A queue, not an inbox', 'Reported listings, people and messages land in one place; a moderator resolves or bans from there.'],
    ['A ban actually removes someone', 'Their listings leave the board and their sessions are cut off, not just a flag on a row.'],
    ['Narrower than admin, on purpose', 'requireRole() separates moderator from admin, so moderation does not imply deleting users.'],
  ];
  points.forEach(([h, b], i) => {
    const y = 1.66 + i * 1.14;
    card(s, { x: 8.52, y, w: 4.21, h: 1.0, fill: PANEL, line: RULE });
    s.addShape(pres.ShapeType.rect, { x: 8.52, y, w: 0.05, h: 1.0, fill: { color: BLUE }, line: { color: BLUE, width: 0.5 } });
    s.addText(h, { x: 8.75, y: y + 0.08, w: 3.8, h: 0.3, isTextBox: true, margin: 0, fontSize: 13, bold: true, color: NAVY, valign: 'top' });
    s.addText(b, { x: 8.75, y: y + 0.38, w: 3.8, h: 0.56, isTextBox: true, margin: 0, fontSize: 11, color: GREY, valign: 'top' });
  });

  card(s, { x: 0.6, y: 5.94, w: 7.65, h: 0.98, fill: BLUE_LT, line: BLUE });
  s.addText(
    [
      { text: 'Everything a moderator does is written down.  ', options: { bold: true, color: BLUE } },
      { text: 'An audit log records who approved, rejected or banned, and when — so a decision can be traced back to a person rather than disappearing into the database.', options: { color: NAVY } },
    ],
    { x: 0.88, y: 5.94, w: 7.1, h: 0.98, isTextBox: true, margin: 0, fontSize: 12, valign: 'middle' }
  );

  s.addNotes('[4:45-5:25] This is the half of the product students never see, and the reason the marketplace stays usable. Point at the figures: they are live, from the real database. If asked why a separate app: it is role-gated at the route and in the UI, so a student account cannot reach it even with a valid session. The email in the sidebar is blurred on purpose.');
}

// =========================================================== 8. RESULTS
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.build });
  s.addText('07  ·  RESULTS', { placeholder: 'eyebrow' });
  s.addText('It works — here is the proof', { placeholder: 'title' });
  s.addText('A whole sale played on the real screens, with 399 automated tests behind it', { placeholder: 'kicker' });

  const shots = [
    { file: 'flow_chat_c.png', w: 816, h: 557, n: '1', cap: 'Offer made in the thread. Accepting it opens a deal and fixes the price.' },
    { file: 'flow_code_c.png', w: 448, h: 296, n: '2', cap: 'The seller generates a 6-digit code, shown on their screen only.' },
    { file: 'flow_done_c.png', w: 476, h: 250, n: '3', cap: 'Both confirm at the gate, the listing is sold, and the review lands.' },
  ];
  shots.forEach((c, i) => {
    const x = 0.6 + i * 4.115;
    const img = sized(c.file, c.w, c.h, { x, y: 1.66, w: 3.9, h: 1.9, top: true });
    s.addImage(img);
    frame(s, { ...img, line: RULE, width: 1 });
    chip(s, { x, y: 3.64, size: 0.3, text: c.n, fill: BLUE, fontSize: 11 });
    s.addText(c.cap, { x: x + 0.42, y: 3.6, w: 3.48, h: 0.52, isTextBox: true, margin: 0, fontSize: 11.5, color: GREY, valign: 'top' });
  });

  tag(s, 'AUTOMATED TESTS BY AREA', { x: 0.6, y: 4.36, w: 5, color: NAVY, size: 10 });
  const areas = [
    ['AI retrieval (in progress)', 102],
    ['Browser end-to-end', 86],
    ['Marketplace and rentals', 69],
    ['Identity and access', 49],
    ['Community and validation', 46],
    ['Moderation and admin', 26],
    ['Chat and messages', 21],
  ];
  s.addChart(
    pres.charts.BAR,
    [{ name: 'Tests', labels: areas.map((a) => a[0]), values: areas.map((a) => a[1]) }],
    {
      x: 0.5, y: 4.58, w: 7.5, h: 2.4,
      barDir: 'bar', barGapWidthPct: 36,
      chartColors: [AMBER, BLUE, TEAL, TEAL, GREEN, NAVY, TEAL],
      catAxisOrientation: 'maxMin',
      catAxisLabelFontFace: '+mn-lt', catAxisLabelFontSize: 11.5, catAxisLabelColor: NAVY,
      catGridLine: { style: 'none' },
      valAxisHidden: true, valGridLine: { style: 'none' },
      valAxisMinVal: 0, valAxisMaxVal: 120,
      showValue: true, dataLabelPosition: 'outEnd',
      dataLabelFontFace: '+mn-lt', dataLabelFontSize: 11.5, dataLabelColor: NAVY,
      showLegend: false, showTitle: false,
    }
  );

  card(s, { x: 8.3, y: 4.36, w: 4.43, h: 2.6, fill: NAVY, line: NAVY });
  s.addText('399', { x: 8.55, y: 4.46, w: 2.4, h: 1.0, isTextBox: true, margin: 0, fontSize: 54, bold: true, color: WHITE, fontFace: 'Cambria', valign: 'middle' });
  s.addText('passing, 0 failing', { x: 10.5, y: 4.64, w: 2.1, h: 0.6, isTextBox: true, margin: 0, fontSize: 14, bold: true, color: MINT, valign: 'middle' });
  [['313', 'server API and unit tests'], ['86', 'browser end-to-end checks']].forEach(([n, l], i) => {
    const y = 5.54 + i * 0.5;
    s.addText(n, { x: 8.55, y, w: 0.9, h: 0.42, isTextBox: true, margin: 0, fontSize: 19, bold: true, color: WHITE, valign: 'middle' });
    s.addText(l, { x: 9.5, y, w: 3.1, h: 0.42, isTextBox: true, margin: 0, fontSize: 12, color: ICE, valign: 'middle' });
  });
  s.addText('Live: campus-connect-94sq.onrender.com', { x: 8.55, y: 6.52, w: 4.0, h: 0.3, isTextBox: true, margin: 0, fontSize: 11, bold: true, color: MINT });

  s.addNotes('[5:25-6:35] The most important slide for C2. These three screenshots are the real product, captured from the end-to-end test: it plays a whole sale across two browser tabs against a throwaway database. Then the chart: tests are spread across every area, and the largest group is the one still in progress. On coverage: we cover behaviour that could cost someone a sale or their privacy — verification, chat authorisation, seat races — rather than chasing a percentage.');
}

// =========================================================== 9. ADVANTAGES / LIMITS / FUTURE
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: SEC.close });
  s.addText('08  ·  ADVANTAGES, LIMITATIONS, FUTURE SCOPE', { placeholder: 'eyebrow' });
  s.addText('Strengths, limits, what is next', { placeholder: 'title' });
  s.addText('What it does well, what it cannot do yet, and where it goes next', { placeholder: 'kicker' });

  const cols = [
    { head: 'Advantages', colour: TEAL, tint: TEAL_LT, items: [
      'Closed to one campus: only a verified @pec.edu.in address signs in',
      'The whole trade in one place: offer, code at the gate, review, trust score',
      'No double-booking: seats and RSVPs change in one guarded write',
      'Tested and live: 399 automated tests, deployed on Render',
    ] },
    { head: 'Limitations', colour: RED, tint: RED_LT, items: [
      'One college by design; each new campus needs its own domain list',
      'Free hosting sleeps when idle, so the first open can take a minute',
      'Browse search is keyword-only: “bike” does not find a cycle',
      'The scam score cannot reach its own gate (it peaks at 55; the gate opens at 70)',
    ] },
    { head: 'Future scope', colour: AMBER, tint: AMBER_LT, items: [
      'Semantic search on Browse and in saved-search alerts',
      'Matching and the RAG cross-sell, tuned on a larger board',
      'Scam-score fix, then a model second opinion on borderline listings',
      'Rental requests as their own type',
      'An installable app: PWA first, then Capacitor',
    ] },
  ];

  cols.forEach((c, i) => {
    const x = 0.6 + i * 4.115;
    card(s, { x, y: 1.68, w: 3.9, h: 4.4, fill: WHITE, line: c.colour, width: 1.25 });
    s.addShape(pres.ShapeType.rect, { x, y: 1.68, w: 3.9, h: 0.48, fill: { color: c.colour }, line: { color: c.colour, width: 0.5 } });
    s.addText(c.head, { x: x + 0.2, y: 1.68, w: 3.5, h: 0.48, isTextBox: true, margin: 0, fontSize: 15, bold: true, color: WHITE, fontFace: 'Cambria', valign: 'middle' });
    c.items.forEach((t, j) => {
      const gap = c.items.length === 5 ? 0.73 : 0.9;
      const y = 2.3 + j * gap;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.22, y: y + 0.08, w: 0.1, h: 0.1, fill: { color: c.colour }, line: { color: c.colour, width: 0.5 } });
      s.addText(t, { x: x + 0.46, y, w: 3.26, h: 0.68, isTextBox: true, margin: 0, fontSize: 12, color: NAVY, valign: 'top' });
    });
  });

  card(s, { x: 0.6, y: 6.2, w: 12.13, h: 0.74, fill: AMBER_LT, line: 'E0A64A' });
  s.addText(
    [
      { text: 'Where the AI work stands:  ', options: { bold: true, color: AMBER } },
      { text: 'semantic matching and the RAG cross-sell are built and measured — right answers score 0.67–0.74, junk 0.59 at most, threshold 0.66 — but on a small board, so they are retuned as listings grow.', options: { color: NAVY } },
    ],
    { x: 0.88, y: 6.2, w: 11.6, h: 0.74, isTextBox: true, margin: 0, fontSize: 12, valign: 'middle' }
  );

  s.addNotes('[6:35-7:25] Read the Limitations column out loud, especially the scam-score line: finding a defect in your own code and saying so plainly is the strongest thing on this slide. For the amber strip: the AI modules work and are measured, but the threshold was calibrated on a small board, which is why it is future work rather than finished.');
}

// =========================================================== 10. CONCLUSION
{
  const s = pres.addSlide({ masterName: 'CONTENT_DARK', sectionTitle: SEC.close });
  s.addText('09  ·  CONCLUSION', { placeholder: 'eyebrow' });
  s.addText('What we take from it', { placeholder: 'title' });
  s.addText('Where the project stands at the mid-term, and what building it taught us', { placeholder: 'kicker' });

  const cols = [
    { head: 'KEY TAKEAWAYS', items: [
      'A verified, closed campus fixes the trust gap that WhatsApp and OLX leave open.',
      'The full loop works end to end — post, chat, offer, code, review — and is tested.',
      'Slow and uncertain work stays off the request path, so the product stays fast.',
    ] },
    { head: 'WHAT WE LEARNED', items: [
      'Make concurrency a database guarantee, not a hope.',
      'Write security tests that fail when the check is removed.',
      'Measure a model’s threshold on known answers before trusting it.',
    ] },
  ];
  cols.forEach((c, i) => {
    const x = 0.7 + i * 4.15;
    tag(s, c.head, { x, y: 1.78, w: 3.7, color: MINT, size: 10 });
    c.items.forEach((t, j) => {
      const y = 2.14 + j * 1.18;
      s.addShape(pres.ShapeType.rect, { x, y: y + 0.06, w: 0.05, h: 0.78, fill: { color: TEAL }, line: { color: TEAL, width: 0.5 } });
      s.addText(t, { x: x + 0.24, y, w: 3.55, h: 1.0, isTextBox: true, margin: 0, fontSize: 13.5, color: WHITE, valign: 'top' });
    });
  });

  tag(s, 'REFERENCES', { x: 9.0, y: 1.78, w: 3.7, color: MINT, size: 10 });
  const refs = [
    'Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS 2020.',
    'Karpukhin et al., Dense Passage Retrieval for Open-Domain Question Answering. EMNLP 2020.',
    'Reimers & Gurevych, Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. EMNLP 2019.',
    'Malkov & Yashunin, Efficient and robust approximate nearest neighbor search using HNSW graphs. IEEE TPAMI 2020.',
    'OWASP, Application Security Verification Standard (ASVS).',
  ];
  s.addText(
    refs.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < refs.length - 1 } })),
    { x: 9.0, y: 2.14, w: 3.73, h: 3.5, isTextBox: true, margin: 0, fontSize: 10.5, color: ICE, valign: 'top', paraSpaceAfter: 7 }
  );

  card(s, { x: 0.7, y: 5.84, w: 12.03, h: 1.0, fill: TEAL, line: TEAL });
  s.addText('Thank you', { x: 1.0, y: 5.84, w: 4.2, h: 1.0, isTextBox: true, margin: 0, fontSize: 30, bold: true, color: WHITE, fontFace: 'Cambria', valign: 'middle' });
  s.addText('Questions?', { x: 5.1, y: 5.84, w: 3.0, h: 1.0, isTextBox: true, margin: 0, fontSize: 22, bold: true, color: 'CFEFF2', valign: 'middle' });
  s.addText('campus-connect-94sq.onrender.com', { x: 7.9, y: 5.84, w: 4.6, h: 1.0, isTextBox: true, margin: 0, fontSize: 14, bold: true, color: WHITE, valign: 'middle', align: 'right' });

  s.addNotes('[7:25-8:00] Three takeaways, one sentence each, then stop. Hand over with the live site already open in a tab so a question about the product can be answered by showing it. The references back the design: the first three are the retrieval and RAG choices, the fourth is why no vector database yet, the fifth is the security model.');
}

(async () => {
  const out = process.argv[2] || 'campus-connect-midterm-v4.pptx';
  await pres.writeFile({ fileName: out });
  const { applyTheme } = require(
    'C:/Users/acer/.claude/skills/synced/c8316acb-025a-437a-8c22-396d071492fc_af0f919b-f2c8-46c9-9a76-0f7196e65fa9/pptx/scripts/apply_theme.js'
  );
  await applyTheme(out, THEME);
  console.log('wrote', out);
})();
