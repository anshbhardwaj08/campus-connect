// The top of a profile: who this is and whether they can be trusted.
//
// Trust score is shown as a number with a bar rather than as a colour —
// a green/amber/red meter would need two accents this system does not have,
// and a number a buyer can actually read is more useful than a hue anyway.
import { Link } from 'react-router-dom';
import { Pencil, Package, Handshake, CalendarDays } from 'lucide-react';

import Panel from '../ui/Panel';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import CaptionBox from '../ui/CaptionBox';

const joined = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

export default function ProfileHeader({ user, isMe = false, listingCount, index = 0 }) {
  if (!user) return null;

  const { name, avatar, dept, batch, trustScore = 0, dealsCompleted = 0, isEmailVerified, createdAt } = user;

  return (
    <Panel index={index}>
      <CaptionBox corner="tl">{isMe ? 'Your handler file' : 'Who you would be meeting'}</CaptionBox>

      <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-start">
        <Avatar name={name} src={avatar} size="xl" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-.01em] text-ink">
              {name}
            </h1>
            {isEmailVerified && <Badge tone="ink">Verified student</Badge>}
          </div>

          <p className="meta mt-1">
            {[dept, batch].filter(Boolean).join(' · ') || 'No branch or year on file'}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Stat icon={Package} label="Listings" value={listingCount ?? '—'} />
            <Stat icon={Handshake} label="Deals done" value={dealsCompleted} />
            <Stat icon={CalendarDays} label="On the page since" value={joined(createdAt)} />
          </dl>

          {/* Trust score: the bar is ink on paper, no colour coding. */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="label-xs">Trust score</span>
              <span className="font-display text-[20px] leading-none text-ink">{trustScore}</span>
            </div>
            <div
              className="mt-1.5 h-2.5 w-full border-2 border-ink bg-paper-3"
              role="img"
              aria-label={`Trust score ${trustScore} out of 100`}
            >
              <div
                className="h-full bg-ink"
                style={{ width: `${Math.max(0, Math.min(100, trustScore))}%` }}
              />
            </div>
          </div>
        </div>

        {isMe && (
          <Link to="/settings" className="shrink-0">
            <Button variant="primary" size="sm">
              <Pencil className="h-3.5 w-3.5" strokeWidth={3} /> Edit
            </Button>
          </Link>
        )}
      </div>
    </Panel>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div>
      <dt className="label-xs flex items-center gap-1">
        <Icon className="h-3 w-3" strokeWidth={2.5} />
        {label}
      </dt>
      <dd className="mt-0.5 text-[15px] font-extrabold text-ink">{value}</dd>
    </div>
  );
}
