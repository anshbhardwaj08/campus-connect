// A throwaway MongoDB, started in memory for the duration of one test file.
//
// Not a "test database" on the real cluster — an actual mongod process,
// listening on a random local port, thrown away when the file finishes. A
// test physically cannot reach Atlas from here.
//
// One per test file rather than one shared: node's runner puts each file in
// its own process, so a shared server would need a lock, and per-file
// isolation is worth more than the ~800ms it costs to boot.

require('./env');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// "In memory" still needs somewhere on disk to put its data files, and
// mongod refuses to start indexing when that drive has under 500MB free.
// The default is the OS temp directory, which on this machine sits on a
// system drive with less than that — so the default is the repo instead,
// overridable for anyone whose layout differs.
//
// TEST_DB_PATH must be a directory this suite is free to delete.
const ROOT = process.env.TEST_DB_PATH || path.join(__dirname, '..', '..', '.test-db');

let mongod;
let dbPath;

const startDb = async () => {
  dbPath = path.join(ROOT, crypto.randomBytes(6).toString('hex'));
  fs.mkdirSync(dbPath, { recursive: true });

  mongod = await MongoMemoryServer.create({ instance: { dbPath } });
  await mongoose.connect(mongod.getUri('collegeolx-test'));

  // Indexes are part of what is under test — the unique index on
  // collegeEmail, the partial index on isBlocked — so let them build.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
};

const stopDb = async () => {
  await mongoose.disconnect();
  await mongod?.stop();
  fs.rmSync(dbPath, { recursive: true, force: true });
};

// Between test groups. Collections are emptied rather than dropped, so the
// indexes built above survive into the next group.
const clearDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

module.exports = { startDb, stopDb, clearDb };
