// Threads and messages.
//
// sendMessage and markRead never checked participant membership: anyone
// holding a conversation id could post into a stranger's thread, or mark
// their messages read. getMessages checked; the other two did not.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi } = require('../helpers/api');
const { makeSignedInUser, makeListing } = require('../helpers/factory');
const Conversation = require('../../src/models/Conversation');
const Message = require('../../src/models/Message');
const LookingFor = require('../../src/models/LookingFor');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

describe('starting a thread', () => {
  let seller;
  let buyer;
  let listing;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
    buyer = await makeSignedInUser();
    listing = await makeListing(seller.user._id);
  });

  test('messaging a seller opens one thread with both people in it', async () => {
    const res = await buyer.api.post('/chat/conversations', { listingId: listing._id });

    assert.equal(res.status, 200);
    const stored = await Conversation.findById(res.body.data.conversation._id);
    assert.equal(stored.participants.length, 2);
    assert.ok(stored.participants.some((p) => String(p) === String(seller.user._id)));
  });

  // Clicking "message the seller" twice must land in the same thread.
  test('asking again lands in the same thread', async () => {
    const res = await buyer.api.post('/chat/conversations', { listingId: listing._id });

    assert.equal(res.status, 200);
    assert.equal(await Conversation.countDocuments(), 1);
  });

  test('you cannot open a thread with yourself about your own listing', async () => {
    const res = await seller.api.post('/chat/conversations', { listingId: listing._id });

    assert.equal(res.status, 400);
    assert.equal(await Conversation.countDocuments(), 1);
  });

  // Conversation.listingId used to be required, so a want, a ride or a
  // found item had no way to be replied to at all.
  test('a community post can be replied to as well', async () => {
    const want = await LookingFor.create({
      title: 'Looking for a second-hand cycle',
      userId: seller.user._id,
    });

    const res = await buyer.api.post('/chat/conversations', {
      subjectType: 'lookingfor',
      subjectId: want._id,
    });

    assert.equal(res.status, 200);
    const stored = await Conversation.findById(res.body.data.conversation._id);
    assert.equal(stored.listingId, undefined);
    assert.equal(stored.subject.kind, 'lookingfor');
    // Denormalised on purpose: otherwise the inbox needs a different
    // populate per kind just to render one line.
    assert.equal(stored.subject.title, 'Looking for a second-hand cycle');
  });

  test('a subject type the product does not have is refused', async () => {
    const res = await buyer.api.post('/chat/conversations', {
      subjectType: 'homework',
      subjectId: listing._id,
    });

    assert.equal(res.status, 400);
  });
});

describe('who may read and write in a thread', () => {
  let seller;
  let buyer;
  let stranger;
  let conversation;

  before(async () => {
    await clearDb();
    seller = await makeSignedInUser();
    buyer = await makeSignedInUser();
    stranger = await makeSignedInUser();
    const listing = await makeListing(seller.user._id);
    conversation = (await buyer.api.post('/chat/conversations', { listingId: listing._id })).body.data
      .conversation;
  });

  test('a participant can send, and the thread remembers the last line', async () => {
    const res = await buyer.api.post(`/chat/conversations/${conversation._id}/messages`, {
      text: 'Is this still available?',
    });

    assert.equal(res.status, 201);
    assert.equal((await Conversation.findById(conversation._id)).lastMessage, 'Is this still available?');
  });

  test('a stranger cannot read the messages', async () => {
    const res = await stranger.api.get(`/chat/conversations/${conversation._id}/messages`);

    assert.equal(res.status, 403);
  });

  test('a stranger cannot post into the thread', async () => {
    const res = await stranger.api.post(`/chat/conversations/${conversation._id}/messages`, {
      text: 'Pay me on UPI first',
    });

    assert.equal(res.status, 403);
    assert.equal(await Message.countDocuments({ conversationId: conversation._id }), 1);
  });

  test('a stranger cannot mark it read', async () => {
    const res = await stranger.api.patch(`/chat/conversations/${conversation._id}/read`);

    assert.equal(res.status, 403);
  });

  test('a thread only appears in its own participants inboxes', async () => {
    const sellerInbox = await seller.api.get('/chat/conversations');
    const strangerInbox = await stranger.api.get('/chat/conversations');

    assert.equal(sellerInbox.body.data.conversations.length, 1);
    assert.equal(strangerInbox.body.data.conversations.length, 0);
  });

  // The chat badge was permanently zero: chatSlice.setUnreadCount existed
  // since the scaffold and nothing ever dispatched it, because the server
  // never returned a count.
  test('the inbox carries an unread count, and marking read clears it', async () => {
    const before = (await seller.api.get('/chat/conversations')).body.data.conversations[0];
    assert.equal(before.unreadCount, 1);

    await seller.api.patch(`/chat/conversations/${conversation._id}/read`);

    const after = (await seller.api.get('/chat/conversations')).body.data.conversations[0];
    assert.equal(after.unreadCount, 0);
    // Reading someone else's messages must not mark your own as read.
    assert.equal((await buyer.api.get('/chat/conversations')).body.data.conversations[0].unreadCount, 0);
  });
});
