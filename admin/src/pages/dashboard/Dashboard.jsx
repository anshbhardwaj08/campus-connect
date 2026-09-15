// Landing page after sign-in. Real figures from GET /admin/stats — five
// numbers, no chart yet (RevenueChart/CategoryDonut/LiveStatsTicker are
// still stubs; see docs/admin-summary.md "Next up"). A dashboard with a
// fabricated chart is worse than no chart at all.
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import adminApi from '../../services/adminApi';
import AdminNavbar from '../../components/layout/AdminNavbar';
import KPICard from '../../components/dashboard/KPICard';
import Button from '../../components/ui/Button';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.get('/admin/stats').then((r) => r.data.data),
  });

  const cards = [
    { label: 'Total users', value: stats?.totalUsers },
    { label: 'Active listings', value: stats?.activeListings },
    { label: 'Total listings', value: stats?.totalListings },
    { label: 'Deals completed', value: stats?.totalDeals },
    { label: 'Open reports', value: stats?.openReports, tone: 'crimson' },
  ];

  return (
    <>
      <AdminNavbar title="Dashboard" blurb="What the marketplace looks like right now." />

      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <KPICard key={c.label} label={c.label} value={c.value ?? 0} loading={isLoading} tone={c.tone} />
          ))}
        </div>

        <div className="panel mt-6 max-w-xl">
          <div className="panel__in gap-3">
            <span className="caption caption--tl">Where to start</span>
            <p className="mt-4 text-[13px] font-semibold leading-relaxed text-ink/80">
              Listings a scam-score check flagged at creation sit in{' '}
              <strong className="font-extrabold">Pending listings</strong> — invisible to
              everyone, including the seller, until approved or rejected here.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-1 self-start"
              onClick={() => navigate('/listings/pending')}
            >
              <ShieldAlert className="h-4 w-4" strokeWidth={3} /> Review pending listings
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
