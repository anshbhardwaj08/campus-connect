// Sets a strong random password on one account and prints it once.
//
//   npm run rotate-password -- someone@pec.edu.in
//
// For the account you need to keep using but whose password has leaked into
// a doc, a chat or a repo. Deleting such an account also works, but that
// loses whatever it is useful for — the demo moderator, for instance, is the
// only way to exercise the moderator role, which is genuinely narrower than
// admin.
//
// Signing them out everywhere is part of the job: rotating the password
// while an old refresh token still works would leave the door open.

require('dotenv').config();
const dns = require('dns');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const emails = process.argv.slice(2).filter(Boolean);

if (!emails.length) {
  console.error('Usage: npm run rotate-password -- <collegeEmail> [more@emails ...]');
  process.exit(1);
}

// base64url over 18 bytes: 24 characters, no ambiguous punctuation to
// mistype, and well beyond anything a list attack reaches.
const generate = () => crypto.randomBytes(18).toString('base64url');

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require('../src/models/User');

  const done = [];
  let missing = 0;

  for (const email of emails) {
    // eslint-disable-next-line no-await-in-loop
    const user = await User.findOne({ collegeEmail: email }).select('+passwordHash name role');
    if (!user) {
      console.error(`No account with collegeEmail ${email}`);
      missing += 1;
      continue;
    }

    const password = generate();
    // eslint-disable-next-line no-await-in-loop
    user.passwordHash = await bcrypt.hash(password, 10);
    // Kills every existing session — see the note at the top.
    user.refreshToken = undefined;
    // eslint-disable-next-line no-await-in-loop
    await user.save();

    done.push({ email, name: user.name, role: user.role, password });
  }

  await mongoose.disconnect();

  console.log('');
  done.forEach((d) => {
    console.log(`Rotated: ${d.name} <${d.email}> (${d.role})`);
    console.log(`         ${d.password}`);
  });

  if (done.length) {
    console.log('\nShown once. Save any you still need — they are not recoverable.');
    console.log('Anyone signed in as these accounts has been signed out.\n');
  }

  process.exit(missing ? 1 : 0);
};

main().catch(async (err) => {
  console.error(`Failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
