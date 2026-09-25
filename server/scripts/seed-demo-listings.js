// Demo listings and wanted posts, built to TEST the matchers rather than to
// fill the page.
//
//   npm run seed:demo -- --for you@pec.edu.in                 (dry run)
//   npm run seed:demo -- --for you@pec.edu.in --commit        (writes)
//   npm run seed:demo -- --for you@pec.edu.in --remove --commit
//
// Every listing belongs to one throwaway seller account, so --remove is
// exact: delete that user and everything of theirs. The wanted posts belong
// to YOU (--for), because the notifications have to land somewhere you can
// actually see them.
//
// The fixtures are chosen, not invented. Each one is labelled with which
// matcher should find it:
//
//   both       the vocabulary already covers the wording
//   semantic   the words do not overlap at all — this is the whole argument
//              for embeddings, and if these stay empty after switching to
//              WANTED_MATCHER=semantic then the switch bought nothing
//   neither    a control. If anything matches these, the threshold is wrong
//
// Run `npm run match:compare` straight afterwards to see the two columns,
// and `npm run crosssell:run` to fill in "Goes with this" for the pairs at
// the bottom of the listing fixtures.

require('dotenv').config();
const dns = require('dns');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const remove = args.includes('--remove');
const forEmail = (args[args.indexOf('--for') + 1] || '').trim().toLowerCase();

if (!args.includes('--for') || !forEmail || forEmail.startsWith('--')) {
  console.error('Usage: npm run seed:demo -- --for <yourCollegeEmail> [--remove] [--commit]');
  process.exit(1);
}

const SELLER_EMAIL = 'demo.seed@pec.edu.in';

const LISTINGS = [
  // --- the vocabulary already handles these -----------------------------
  {
    title: 'Hercules Roadeo 26in gear cycle',
    description: 'Ridden two semesters, tyres replaced last month. Lock included.',
    price: 4200, category: 'cycles', condition: 'used',
  },
  {
    title: 'Casio fx-991EX scientific',
    description: 'Bought for first year, barely used since. All functions working.',
    price: 900, category: 'stationery', condition: 'like-new',
  },
  // --- no shared words at all: semantic should find these ---------------
  {
    title: 'Study table with three drawers',
    description: 'Solid wood, fits under a hostel window. Slight scratch on top.',
    price: 2500, category: 'furniture', condition: 'used',
  },
  {
    title: 'Mini fridge, 90 litres',
    description: 'Single door, runs quiet. Perfect for a hostel room.',
    price: 5500, category: 'appliances', condition: 'used',
  },
  {
    title: 'Bajaj room heater, 2000W',
    description: 'Two heat settings. Used one winter only.',
    price: 1800, category: 'appliances', condition: 'like-new',
  },
  {
    title: 'Cengel Thermodynamics, 7th edition',
    description: 'Standard text for the core thermo course. Some pencil notes inside.',
    price: 450, category: 'books', condition: 'used',
  },
  // --- control: nothing asks for this -----------------------------------
  {
    title: 'Nike running shoes, size 9',
    description: 'Worn a handful of times, too small for me.',
    price: 2200, category: 'clothing', condition: 'like-new',
  },

  // --- pairs, for "Goes with this" --------------------------------------
  //
  // Cross-sell can only suggest what is actually on the board, so the board
  // has to contain the pairs. Each anchor below has its companions listed
  // too, and a decoy of the same KIND as the anchor — another phone, another
  // cycle — because the mistake this feature makes is recommending a
  // substitute instead of a complement, and nothing catches that if there is
  // no substitute to be tempted by.
  {
    title: 'Redmi Note 12, 128GB',
    description: 'Two years old, battery still fine. Box and bill included.',
    price: 8000, category: 'electronics', condition: 'used',
  },
  {
    title: 'Silicone back cover for Redmi Note 12',
    description: 'Clear, barely used. Bought the wrong size.',
    price: 150, category: 'electronics', condition: 'like-new',
  },
  {
    title: 'Tempered glass screen guard, Redmi',
    description: 'Unopened pack of two.',
    price: 100, category: 'electronics', condition: 'new',
  },
  {
    title: '20000mAh power bank',
    description: 'Charges a phone about four times. Type-C in and out.',
    price: 900, category: 'electronics', condition: 'used',
  },
  {
    title: 'iPhone 11, 64GB',
    description: 'Decoy: another phone. A cross-sell must NOT suggest this.',
    price: 16000, category: 'electronics', condition: 'used',
  },
  {
    title: 'Cycle lock with keys',
    description: 'Hardened chain, two keys. Used one semester.',
    price: 250, category: 'cycles', condition: 'used',
  },
  {
    title: 'Cycling helmet, medium',
    description: 'Never had a fall in it.',
    price: 600, category: 'cycles', condition: 'like-new',
  },
];

const WANTED = [
  { title: 'need a cycle for campus', expect: 'both' },
  { title: 'calculator for exams', expect: 'both' },
  { title: 'something to study on in my room', expect: 'semantic' },
  { title: 'somewhere to keep my food cold', expect: 'semantic' },
  { title: 'something to stay warm this winter', expect: 'semantic' },
  { title: 'mechanical engineering reference for thermo', expect: 'semantic' },
  { title: 'dbjs', expect: 'neither' },
];

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const User = require('../src/models/User');
  const Listing = require('../src/models/Listing');
  const LookingFor = require('../src/models/LookingFor');

  const owner = await User.findOne({ collegeEmail: forEmail });
  if (!owner) {
    throw new Error(`No account with collegeEmail ${forEmail} — the wanted posts need an owner`);
  }

  const seller = await User.findOne({ collegeEmail: SELLER_EMAIL });
  const titles = WANTED.map((w) => w.title);

  if (remove) {
    const listingCount = seller ? await Listing.countDocuments({ sellerId: seller._id }) : 0;
    const wantedCount = await LookingFor.countDocuments({ userId: owner._id, title: { $in: titles } });

    console.log(`\nWould remove: ${listingCount} demo listing(s), ${wantedCount} demo wanted post(s)`);
    console.log(seller ? `             and the seller account ${SELLER_EMAIL}` : '');

    if (!commit) {
      console.log('\nDry run. Nothing was written. Add --commit to apply.');
    } else {
      if (seller) {
        await Listing.deleteMany({ sellerId: seller._id });
        await User.deleteOne({ _id: seller._id });
      }
      await LookingFor.deleteMany({ userId: owner._id, title: { $in: titles } });
      console.log('\nRemoved.');
    }

    await mongoose.disconnect();
    return;
  }

  console.log(`\nWould create ${LISTINGS.length} listing(s) under ${SELLER_EMAIL}:`);
  LISTINGS.forEach((l) => console.log(`   ₹${String(l.price).padEnd(5)} ${l.title}`));

  console.log(`\nand ${WANTED.length} wanted post(s) under ${forEmail}:`);
  WANTED.forEach((w) => console.log(`   [${w.expect.padEnd(8)}] ${w.title}`));

  if (!commit) {
    console.log('\nDry run. Nothing was written. Add --commit to apply.');
    await mongoose.disconnect();
    return;
  }

  const sellerDoc =
    seller ||
    (await User.create({
      name: 'Demo Seller',
      email: 'demo.seed@example.com',
      collegeEmail: SELLER_EMAIL,
      phone: '9999900001',
      // Random and never printed: nobody is meant to sign in as this account,
      // it exists to own the demo listings so they can be deleted together.
      passwordHash: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
      isEmailVerified: true,
    }));

  // Idempotent: running twice must not leave two of everything.
  await Listing.deleteMany({ sellerId: sellerDoc._id });
  await LookingFor.deleteMany({ userId: owner._id, title: { $in: titles } });

  await Listing.insertMany(
    LISTINGS.map((l) => ({
      ...l,
      sellerId: sellerDoc._id,
      status: 'active',
      images: [],
      pickupLocation: 'Himalaya hostel gate',
    }))
  );

  await LookingFor.insertMany(
    WANTED.map((w) => ({ userId: owner._id, title: w.title, status: 'open' }))
  );

  console.log(`\nCreated. Seller account: ${SELLER_EMAIL} (no usable password, by design).`);
  console.log('\nNext:');
  console.log('   npm run match:compare        -- both matchers over these posts');
  console.log('   npm run seed:demo -- --for <email> --remove --commit   to clean up');

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
