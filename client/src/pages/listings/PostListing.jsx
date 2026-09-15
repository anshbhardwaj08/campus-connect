// Create a new listing. Protected route — ProtectedRoute bounces anyone
// unauthenticated to /login before this ever renders.
import PageWrapper from '../../components/layout/PageWrapper';
import ListingForm from '../../components/listing/ListingForm';

export default function PostListing() {
  return (
    <PageWrapper className="max-w-3xl">
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          SELL <span className="text-crimson">SOMETHING</span>
        </h1>
        <p className="meta mt-2 max-w-[52ch] leading-relaxed">
          Twelve fields at most. The ones that matter are the price and the flaws.
        </p>
      </header>

      <ListingForm />
    </PageWrapper>
  );
}
