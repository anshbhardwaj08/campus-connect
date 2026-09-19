// A conversation belongs to its two participants. Nobody else may join its
// socket room, post into it, make an offer in it or change its deal status.
//
// Every one of these used to work for any signed-in student who had the
// conversation's id: the socket handlers trusted whatever id they were sent.
// The live database held a message posted into a thread by someone outside
// it. These tests talk to the socket directly, the way someone poking at the
// API would, rather than through the UI, which never offers the attack.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { startStack, stopStack, makeUser, makeListing, db, API, ACCESS_SECRET } from './harness.mjs';

const requireHere = createRequire(import.meta.url);
const { io } = requireHere('socket.io-client');
const jwt = createRequire(new URL('../../../server/package.json', import.meta.url))('jsonwebtoken');

after(stopStack);

const sockets = [];
const connect = (user) =>
  new Promise((resolve, reject) => {
    const token = jwt.sign({ userId: String(user._id) }, ACCESS_SECRET, { expiresIn: '10m' });
    const s = io(API, { auth: { token }, transports: ['websocket'], forceNew: true });
    sockets.push(s);
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
after(() => sockets.forEach((s) => s.close()));

// Emits, then resolves with the first 'error' the server sends back, or
// null if none arrives in time. A refused event answers with an error; an
// accepted one does not.
const emitExpectingError = (socket, event, payload, ms = 1500) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off('error', onError);
      resolve(null);
    }, ms);
    const onError = (e) => {
      clearTimeout(timer);
      resolve(e?.message || 'error');
    };
    socket.once('error', onError);
    socket.emit(event, payload);
  });

// Resolves true if `event` reaches the socket within `ms`.
const receives = (socket, event, ms = 1500) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    socket.once(event, () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

let buyer, seller, outsider, conversationId;
let buyerSocket, sellerSocket, outsiderSocket;

// One hook, not two: the stack has to be up before anything is seeded, and
// two top-level before() hooks are not a safe way to promise that order.
before(async () => {
  await startStack();
  seller = await makeUser({ name: 'Chat Seller' });
  buyer = await makeUser({ name: 'Chat Buyer' });
  outsider = await makeUser({ name: 'Chat Outsider' });
  const listing = await makeListing(seller._id);
  const { insertedId } = await db()
    .collection('conversations')
    .insertOne({
      participants: [buyer._id, seller._id],
      listingId: listing._id,
      subject: { kind: 'listing', refId: listing._id },
      lastMessage: '',
      lastMessageAt: new Date(),
      dealStatus: 'chatting',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  conversationId = String(insertedId);

  [buyerSocket, sellerSocket, outsiderSocket] = await Promise.all([connect(buyer), connect(seller), connect(outsider)]);
  // Joining checks the database now, so wait for the server to say yes.
  for (const s of [buyerSocket, sellerSocket]) {
    const ack = await s.timeout(5000).emitWithAck('conversation:join', conversationId);
    assert.equal(ack?.ok, true, 'a participant should be let into the room');
  }
}, { timeout: 180000 });

const messagesFrom = (user) => db().collection('messages').countDocuments({ senderId: user._id });

test('the participants can still talk, live', async () => {
  const arrives = receives(sellerSocket, 'chat:message');
  buyerSocket.emit('chat:message', { conversationId, text: 'Still available?' });
  assert.ok(await arrives, 'the seller should get the buyer message');
  assert.equal(await messagesFrom(buyer), 1);
});

test('an outsider cannot join the room and read it live', async () => {
  const refused = await emitExpectingError(outsiderSocket, 'conversation:join', conversationId);
  assert.match(String(refused), /not a participant/i);

  const overheard = receives(outsiderSocket, 'chat:message');
  sellerSocket.emit('chat:message', { conversationId, text: 'Yes, come by the gate' });
  assert.equal(await overheard, false, 'the outsider must not receive the thread');
});

test('an outsider cannot post into it', async () => {
  const refused = await emitExpectingError(outsiderSocket, 'chat:message', { conversationId, text: 'hi from outside' });
  assert.match(String(refused), /not a participant/i);
  assert.equal(await messagesFrom(outsider), 0);
});

test('an outsider cannot make an offer in it', async () => {
  const refused = await emitExpectingError(outsiderSocket, 'chat:offer', { conversationId, offerAmount: 1 });
  assert.match(String(refused), /not a participant/i);
  assert.equal(await messagesFrom(outsider), 0);
});

test('an outsider cannot change its deal status', async () => {
  const refused = await emitExpectingError(outsiderSocket, 'deal:agreed', { conversationId });
  assert.match(String(refused), /not a participant/i);
  const fresh = await db().collection('conversations').findOne({ participants: buyer._id });
  assert.notEqual(fresh.dealStatus, 'agreed');
});

test('a made-up or malformed conversation id is refused, not crashed on', async () => {
  for (const bad of ['not-an-id', '000000000000000000000000', { $ne: null }]) {
    const refused = await emitExpectingError(outsiderSocket, 'chat:message', { conversationId: bad, text: 'x' });
    assert.match(String(refused), /not a participant/i, `for ${JSON.stringify(bad)}`);
  }
});

test('a participant cannot send junk either', async () => {
  const before = await messagesFrom(buyer);
  const cases = [
    ['chat:message', { conversationId, text: '   ' }, /empty/i],
    ['chat:message', { conversationId, text: 'x'.repeat(2001) }, /under 2000/i],
    ['chat:message', { conversationId, type: 'offer', text: 'fake offer card' }, /unknown message type/i],
    ['chat:message', { conversationId, type: 'image', imageUrl: 'javascript:alert(1)' }, /https/i],
    ['chat:offer', { conversationId, offerAmount: 'lots' }, /amount/i],
    ['chat:offer', { conversationId, offerAmount: -50 }, /amount/i],
  ];
  for (const [event, payload, expected] of cases) {
    const refused = await emitExpectingError(buyerSocket, event, payload);
    assert.match(String(refused), expected, `${event} ${JSON.stringify(payload).slice(0, 60)}`);
  }
  assert.equal(await messagesFrom(buyer), before, 'none of those should have been stored');
});

test('nobody can broadcast a price to every connected user', async () => {
  const heard = receives(buyerSocket, 'listing:priceUpdate');
  outsiderSocket.emit('listing:priceUpdate', { listingId: 'x', price: 1 });
  assert.equal(await heard, false);
});
