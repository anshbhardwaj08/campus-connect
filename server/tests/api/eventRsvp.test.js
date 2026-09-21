// Saying you are going to an event.
//
// The old RSVP added one to a counter on whatever id it was handed. Nobody
// was recorded, so tapping twice counted twice, nobody could change their
// mind, and "12 going" meant "the button was pressed 12 times". These tests
// are mostly about that: the count has to mean people.

require('../helpers/env');

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('../helpers/db');
const { startApi, stopApi, client } = require('../helpers/api');
const { makeSignedInUser } = require('../helpers/factory');
const Event = require('../../src/models/Event');

before(async () => {
  await startDb();
  await startApi();
});
after(async () => {
  await stopApi();
  await stopDb();
});

const makeEvent = (organizerId, overrides = {}) =>
  Event.create({
    title: 'Inter-hostel football final',
    organizerId,
    date: new Date(Date.now() + 7 * 86400000),
    location: 'Main ground',
    ...overrides,
  });

describe('going, and changing your mind', () => {
  let organizer;
  let student;
  let event;

  before(async () => {
    await clearDb();
    organizer = await makeSignedInUser();
    student = await makeSignedInUser();
    event = await makeEvent(organizer.user._id);
  });

  test('saying you are going records who you are', async () => {
    const res = await student.api.patch(`/events/${event._id}/rsvp`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.rsvpCount, 1);
    assert.equal(res.body.data.event.isGoing, true);

    const stored = await Event.findById(event._id);
    assert.equal(stored.attendees.length, 1);
    assert.equal(String(stored.attendees[0].userId), String(student.user._id));
  });

  // The whole point: the number is people, not taps.
  test('saying it twice does not count twice', async () => {
    const res = await student.api.patch(`/events/${event._id}/rsvp`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.rsvpCount, 1);
    assert.equal((await Event.findById(event._id)).attendees.length, 1);
  });

  test('the attendee list never leaves the server', async () => {
    const res = await student.api.get('/events');
    const listed = res.body.data.events.find((e) => String(e._id) === String(event._id));

    assert.equal(listed.attendees, undefined, 'who is going is nobody else’s business');
    assert.equal(listed.rsvpCount, 1);
  });

  test('pulling out takes the count back down', async () => {
    const res = await student.api.delete(`/events/${event._id}/rsvp`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.rsvpCount, 0);
    assert.equal(res.body.data.event.isGoing, false);
    assert.equal((await Event.findById(event._id)).attendees.length, 0);
  });

  test('pulling out of something you were not going to is not an error', async () => {
    const res = await student.api.delete(`/events/${event._id}/rsvp`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.rsvpCount, 0);
  });

  test('the board shows each person their own answer', async () => {
    await student.api.patch(`/events/${event._id}/rsvp`);

    const mine = await student.api.get('/events');
    const theirs = await organizer.api.get('/events');

    assert.equal(mine.body.data.events[0].isGoing, true);
    assert.equal(theirs.body.data.events[0].isGoing, false);
  });

  test('a visitor who is not signed in still sees the board', async () => {
    // A fresh client with an empty cookie jar is a signed-out visitor.
    const res = await client().get('/events');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.events[0].isGoing, false);
  });
});

describe('limits', () => {
  let organizer;

  before(async () => {
    await clearDb();
    organizer = await makeSignedInUser();
  });

  test('a full event turns people away, and says so', async () => {
    const event = await makeEvent(organizer.user._id, { capacity: 2 });
    const [a, b, c] = [await makeSignedInUser(), await makeSignedInUser(), await makeSignedInUser()];

    assert.equal((await a.api.patch(`/events/${event._id}/rsvp`)).status, 200);
    const second = await b.api.patch(`/events/${event._id}/rsvp`);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.event.spotsLeft, 0);

    const third = await c.api.patch(`/events/${event._id}/rsvp`);
    assert.equal(third.status, 409);
    assert.match(third.body.message, /full/i);
    assert.equal((await Event.findById(event._id)).attendees.length, 2);
  });

  // Two people taking the last spot at the same moment.
  test('the last spot goes to one person', async () => {
    const event = await makeEvent(organizer.user._id, { capacity: 1 });
    const a = await makeSignedInUser();
    const b = await makeSignedInUser();

    const [resA, resB] = await Promise.all([
      a.api.patch(`/events/${event._id}/rsvp`),
      b.api.patch(`/events/${event._id}/rsvp`),
    ]);

    assert.deepEqual([resA.status, resB.status].sort(), [200, 409]);
    assert.equal((await Event.findById(event._id)).attendees.length, 1);
  });

  test('somebody dropping out frees their spot', async () => {
    const event = await makeEvent(organizer.user._id, { capacity: 1 });
    const a = await makeSignedInUser();
    const b = await makeSignedInUser();

    await a.api.patch(`/events/${event._id}/rsvp`);
    assert.equal((await b.api.patch(`/events/${event._id}/rsvp`)).status, 409);

    await a.api.delete(`/events/${event._id}/rsvp`);
    assert.equal((await b.api.patch(`/events/${event._id}/rsvp`)).status, 200);
  });

  test('an event with no capacity has no limit', async () => {
    const event = await makeEvent(organizer.user._id);
    const res = await (await makeSignedInUser()).api.patch(`/events/${event._id}/rsvp`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.spotsLeft, null);
  });

  test('you cannot say you are going to something that has happened', async () => {
    const gone = await makeEvent(organizer.user._id, { date: new Date(Date.now() - 86400000) });
    const res = await (await makeSignedInUser()).api.patch(`/events/${gone._id}/rsvp`);

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already happened/i);
  });

  test('an event that does not exist is a 404, not a crash', async () => {
    const student = await makeSignedInUser();
    assert.equal((await student.api.patch('/events/not-an-id/rsvp')).status, 404);
    assert.equal((await student.api.patch('/events/000000000000000000000000/rsvp')).status, 404);
  });
});
