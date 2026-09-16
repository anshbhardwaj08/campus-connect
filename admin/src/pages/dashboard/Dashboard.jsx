// Landing page after sign-in. Everything here is a real figure from the
// database: five counts from GET /admin/stats, a rolling series from
// GET /admin/stats/activity, and the live strip seeded from today's bucket
// of that same series. Nothing on this page is sample data.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import adminApi from '../../services/adminApi';
import AdminNavbar from '../../components/layout/AdminNavbar';
import KPICard from '../../components/dashboard/KPICard';
import ActivityChart from '../../components/dashboard/ActivityChart';
import CategoryDonut from '../../components/dashboard/CategoryDonut';
import LiveStatsTicker from '../../components/dashboard/LiveStatsTicker';
import useLiveActivity, { activityKey } from '../../hooks/useLiveActivity';
import Button from '../../components/ui/Button';

export default function Dashboard() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.get('/admin/stats').then((r) => r.data.data),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: activityKey(days),
    queryFn: () => adminApi.get(`/admin/stats/activity?days=${days}`).then((r) => r.data.data),
  });

  const live = useLiveActivity(days);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin', 'stats', 'categories'],
    queryFn: () => adminApi.get('/admin/stats/categories').then((r) => r.data.data),
  });

  const series = activity?.series ?? [];

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
        <LiveStatsTicker today={series[series.length - 1]} live={live} />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <KPICard key={c.label} label={c.label} value={c.value ?? 0} loading={isLoading} tone={c.tone} />
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <ActivityChart
            series={series}
            days={days}
            onRangeChange={setDays}
            loading={activityLoading}
          />
          <CategoryDonut data={categories ?? []} loading={categoriesLoading} />
        </div>

        <div className="panel mt-4 max-w-xl">
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
