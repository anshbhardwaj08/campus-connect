// Settling a community post from the chat, driven through the real screens
// by two people in two tabs.
//
// The board used to be write-only: a ride's seat count never moved and a
// found wallet stayed up until its owner remembered to close it. Now the
// rider asks in the thread, the driver confirms, and the ride loses the
// seats — closing itself when the last one goes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startStack,
  stopStack,
  openTab,
  makeUser,
  signIn,
  press,
  waitForText,
  waitForDialog,
  db,
  oid,
} from './harness.mjs';

before(startStack, { timeout: 180000 });
after(stopStack);

const makeRide = async (userId, seatsAvailable, to) => {
  const { insertedId } = await db().collection('carpools').insertOne({
    userId,
    from: 'Main gate',
    to,
    departureDate: new Date(Date.now() + 2 * 86400000),
    seatsAvailable,
    contactInfo: '99999 00000',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return insertedId;
};

test('a ride loses its seats when the driver confirms, and closes on the last one', async (t) => {
  const driver = await makeUser({ name: 'Ride Driver' });
  const rider = await makeUser({ name: 'Ride Rider' });
  const rideId = await makeRide(driver._id, 2, 'Chandigarh station');

  const driverTab = await openTab();
  const riderTab = await openTab();
  await signIn(driverTab, driver);
  await signIn(riderTab, rider);

  await t.test('the rider asks for both seats from the ride', async () => {
    await riderTab.go('/carpool');
    await waitForText(riderTab, 'Chandigarh station');
    await Promise.all([
      riderTab.waitForFunction(() => location.pathname === '/chat', { timeout: 20000 }),
      press(riderTab, 'Got a seat?'),
    ]);

    await press(riderTab, 'Ask for a seat');
    await waitForDialog(riderTab);
    await riderTab.locator('[aria-label="2 seats"]').click();
    await press(riderTab, 'Ask for 2 seats');
    await waitForText(riderTab, 'You asked for a seat');

    // Asking is not taking: the ride is untouched until the driver agrees.
    const ride = await db().collection('carpools').findOne({ _id: oid(rideId) });
    assert.equal(ride.seatsAvailable, 2);
  });

  await t.test('the driver sees the request and confirms it', async () => {
    await driverTab.go('/chat');
    await press(driverTab, 'Ride Rider');
    await waitForText(driverTab, 'They asked for a seat');
    await press(driverTab, 'Confirm');
    await waitForText(driverTab, 'Seat confirmed');

    const ride = await db().collection('carpools').findOne({ _id: oid(rideId) });
    assert.equal(ride.seatsAvailable, 0, 'both seats should be gone');
    assert.equal(ride.status, 'closed', 'the last seat closes the ride');
  });

  await t.test('the ride is off the board and the rider cannot ask again', async () => {
    await riderTab.go('/carpool');
    assert.equal(await riderTab.has('Chandigarh station'), false, 'a closed ride is off the board');

    await riderTab.go('/chat');
    await press(riderTab, 'Ride Driver'); // reopen the thread from the list
    await waitForText(riderTab, 'This post is closed');
  });

  await t.test('nothing went wrong along the way', () => {
    for (const [who, tab] of [
      ['driver', driverTab],
      ['rider', riderTab],
    ]) {
      assert.equal(tab.errors.length, 0, `${who} console: ${tab.errors.join(' | ')}`);
      assert.equal(tab.failures.length, 0, `${who} API: ${tab.failures.join(' | ')}`);
    }
  });

  await driverTab.close_();
  await riderTab.close_();
});

test('a found item is claimed in the chat and comes off the board', async (t) => {
  const owner = await makeUser({ name: 'Bottle Owner' });
  const finder = await makeUser({ name: 'Bottle Finder' });
  const { insertedId: itemId } = await db().collection('lostfounds').insertOne({
    userId: owner._id,
    type: 'lost',
    title: 'Blue steel water bottle',
    description: 'Left in the library reading room.',
    location: 'Library',
    images: [],
    status: 'open',
    date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const ownerTab = await openTab();
  const finderTab = await openTab();
  await signIn(ownerTab, owner);
  await signIn(finderTab, finder);

  await t.test('the finder says they have it', async () => {
    await finderTab.go('/lost-found');
    await waitForText(finderTab, 'Blue steel water bottle');
    await Promise.all([
      finderTab.waitForFunction(() => location.pathname === '/chat', { timeout: 20000 }),
      press(finderTab, 'I have seen it'),
    ]);

    await press(finderTab, 'I have this');
    await waitForText(finderTab, 'You said you have it');
  });

  await t.test('the owner confirms and the post closes itself', async () => {
    await ownerTab.go('/chat');
    await press(ownerTab, 'Bottle Finder');
    await waitForText(ownerTab, 'They say they have it');
    await press(ownerTab, 'Confirm');
    await waitForText(ownerTab, 'the post is closed');

    const item = await db().collection('lostfounds').findOne({ _id: oid(itemId) });
    assert.equal(item.status, 'resolved');

    await ownerTab.go('/lost-found');
    assert.equal(await ownerTab.has('Blue steel water bottle'), false);
  });

  await t.test('nothing went wrong along the way', () => {
    for (const [who, tab] of [
      ['owner', ownerTab],
      ['finder', finderTab],
    ]) {
      assert.equal(tab.errors.length, 0, `${who} console: ${tab.errors.join(' | ')}`);
      assert.equal(tab.failures.length, 0, `${who} API: ${tab.failures.join(' | ')}`);
    }
  });

  await ownerTab.close_();
  await finderTab.close_();
});

test('an event counts people, not taps, and fills up', async (t) => {
  const organizer = await makeUser({ name: 'Event Organizer' });
  const student = await makeUser({ name: 'Keen Student' });
  const spare = await makeUser({ name: 'Late Student' });
  const title = 'Guest lecture on bridge design';

  const { insertedId: eventId } = await db().collection('events').insertOne({
    title,
    description: 'One hour, main auditorium.',
    organizerId: organizer._id,
    date: new Date(Date.now() + 5 * 86400000),
    location: 'Main auditorium',
    isFree: true,
    ticketPrice: 0,
    capacity: 1, // one spot, so the next person meets a full event
    attendees: [],
    rsvpCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const studentTab = await openTab();
  await signIn(studentTab, student);

  await t.test('saying you are going sticks, and saying it twice does not count twice', async () => {
    await studentTab.go('/events');
    await waitForText(studentTab, title);
    await press(studentTab, "I'm going");
    await waitForText(studentTab, "You're going");

    // A reload is the real test: the old counter forgot who you were.
    await studentTab.go('/events');
    await waitForText(studentTab, "You're going");

    const event = await db().collection('events').findOne({ _id: oid(eventId) });
    assert.equal(event.attendees.length, 1);
    assert.equal(event.rsvpCount, 1);
  });

  await t.test('the next person finds it full', async () => {
    const lateTab = await openTab();
    await signIn(lateTab, spare);
    await lateTab.go('/events');
    await waitForText(lateTab, 'Full');
    assert.equal(await lateTab.has('1 going'), true);
    await lateTab.close_();
  });

  await t.test('pulling out frees the spot', async () => {
    await studentTab.go('/events');
    await press(studentTab, "You're going");
    await waitForText(studentTab, "I'm going");

    const event = await db().collection('events').findOne({ _id: oid(eventId) });
    assert.equal(event.attendees.length, 0);
    assert.equal(event.rsvpCount, 0);
  });

  await t.test('nothing went wrong along the way', () => {
    assert.equal(studentTab.errors.length, 0, studentTab.errors.join(' | '));
    assert.equal(studentTab.failures.length, 0, studentTab.failures.join(' | '));
  });

  await studentTab.close_();
});
