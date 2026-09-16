// Create a new listing. Protected route — ProtectedRoute bounces anyone
// unauthenticated to /login before this ever renders.
//
// The headline follows the sale/rent switch inside the form. Leaving it on
// "SELL SOMETHING" while the form below asks for a daily rate would be the
// page contradicting itself.
import { useState } from 'react';

import PageWrapper from '../../components/layout/PageWrapper';
import ListingForm from '../../components/listing/ListingForm';

export default function PostListing() {
  const [type, setType] = useState('sale');
  const renting = type === 'rent';

  return (
    <PageWrapper className="max-w-3xl">
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          {renting ? 'LEND ' : 'SELL '}
          <span className="text-crimson">SOMETHING</span>
        </h1>
        <p className="meta mt-2 max-w-[52ch] leading-relaxed">
          {renting
            ? 'Twelve fields at most. The ones that matter are the rate and how long a hire lasts.'
            : 'Twelve fields at most. The ones that matter are the price and the flaws.'}
        </p>
      </header>

      <ListingForm onTypeChange={setType} />
    </PageWrapper>
  );
}
