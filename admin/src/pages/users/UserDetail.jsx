// One account: who they are, what they have posted, what they have
// traded, and the ban switch. `GET /admin/users/:id` is new — the public
// `/users/:id` deliberately withholds email, phone, role and isBlocked,
// none of which an admin can do this job without.
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Package, Handshake, Star, Trash2 } from 'lucide-react';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import AdminNavbar from '../../components/layout/AdminNavbar';
import Panel from '../../components/ui/Panel';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Skeleton from '../../components/ui/Skeleton';
import formatPrice from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';

const ROLE_TONE = { admin: 'crimson', moderator: 'ink', student: 'outline' };

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: me } = useAdminAuth();
  const [tab, setTab] = useState('listings');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminApi.get(`/admin/users/${id}`).then((r) => r.data.data.user),
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['admin', 'listings', { sellerId: id }],
    queryFn: () =>
      adminApi.get('/admin/listings', { params: { sellerId: id, limit: 50 } }).then((r) => r.data.data.listings),
    enabled: tab === 'listings',
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ['admin', 'deals', { userId: id }],
    queryFn: () => adminApi.get('/admin/deals', { params: { userId: id, limit: 50 } }).then((r) => r.data.data.deals),
    enabled: tab === 'deals',
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', 'user', id],
    // Public endpoint (same one PublicProfile uses on /client — reviews
    // are not sensitive the way email/phone are), just called through
    // adminApi since that already points at the same API base.
    queryFn: () => adminApi.get(`/users/${id}/reviews`).then((r) => r.data.data.reviews),
    enabled: tab === 'reviews',
  });

  const setBlocked = useMutation({
    mutationFn: ({ blocked, reason }) =>
      adminApi.patch(`/admin/users/${id}/${blocked ? 'ban' : 'unban'}`, blocked ? { reason } : undefined),
    onSuccess: (_res, { blocked }) => {
      toast.success(blocked ? 'User banned.' : 'User unbanned.');
      setBanOpen(false);
      setBanReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update that user.')),
  });

  const remove = useMutation({
    mutationFn: () => adminApi.delete(`/admin/users/${id}`),
    onSuccess: (res) => {
      const { removed, name } = res.data.data;
      const total = Object.values(removed).reduce((sum, n) => sum + n, 0);
      toast.success(`${name} deleted, along with ${total} related record${total === 1 ? '' : 's'}.`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      navigate('/users');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete that account.')),
  });

  if (isLoading) {
    return (
      <>
        <AdminNavbar title="User" />
        <div className="p-6">
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AdminNavbar title="User" />
        <div className="p-6">
          <div className="border-2 border-dashed border-ink/25 px-4 py-14 text-center">
            <p className="text-[14px] font-extrabold text-ink">No such account.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar
        title={user.name}
        blurb={user.collegeEmail}
        actions={
          <>
            <Button variant="paper" size="sm" onClick={() => navigate('/users')}>
              <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Back
            </Button>
            <Button
              variant={user.isBlocked ? 'ink' : 'primary'}
              size="sm"
              loading={setBlocked.isPending}
              onClick={() =>
                user.isBlocked
                  ? setBlocked.mutate({ blocked: false })
                  : (setBanReason(''), setBanOpen(true))
              }
            >
              {user.isBlocked ? 'Unban' : 'Ban'}
            </Button>
          </>
        }
      />

      <div className="p-6">
        <Panel flush>
          <div className="flex flex-wrap items-center gap-4 p-4">
            <Avatar name={user.name} src={user.avatar} size="lg" />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Badge tone={ROLE_TONE[user.role] || 'paper'}>{user.role}</Badge>
              {user.isBlocked ? <Badge tone="crimson">Blocked</Badge> : <Badge tone="ink">Active</Badge>}
              {user.isEmailVerified && <Badge tone="cold">Email verified</Badge>}
              {user.dept && <Badge tone="outline">{user.dept}</Badge>}
              {user.batch && <Badge tone="outline">{user.batch}</Badge>}
            </div>
            <div className="flex gap-6 text-right">
              <Stat label="Trust score" value={user.trustScore} />
              <Stat label="Deals" value={user.dealsCompleted} />
              <Stat label="Joined" value={timeAgo(user.createdAt)} small />
            </div>
          </div>

          {user.isBlocked && (
            <div className="border-t-2 border-ink/10 px-4 py-2.5">
              <p className="label-xs mb-1">Suspended</p>
              <p className="text-[12.5px] font-semibold leading-relaxed text-ink">
                {user.banReason || <em className="text-steel">No reason was recorded.</em>}
              </p>
            </div>
          )}

          {(user.phone || user.hostel) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t-2 border-ink/10 px-4 py-2.5">
              {user.phone && <p className="meta">Phone: {user.phone}</p>}
              {user.hostel && <p className="meta">Hostel: {user.hostel}</p>}
            </div>
          )}
        </Panel>

        <div className="mt-5 flex gap-1 border-b-[3px] border-ink">
          {[
            { key: 'listings', label: 'Listings', icon: Package },
            { key: 'deals', label: 'Deals', icon: Handshake },
            { key: 'reviews', label: 'Reviews', icon: Star },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 border-2 border-b-0 px-3.5 py-2 text-[11.5px] font-extrabold uppercase tracking-[.05em] ${
                tab === key ? 'border-ink bg-ink text-paper-3' : 'border-transparent text-steel hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
              {label}
            </button>
          ))}
        </div>

        <div className="border-2 border-t-0 border-ink bg-paper-3 p-4">
          {tab === 'listings' && (
            <RowList
              loading={listingsLoading}
              items={listings}
              emptyText="Nothing posted."
              render={(l) => (
                <>
                  <span className="flex-1 truncate font-bold text-ink">{l.title}</span>
                  <Badge tone="outline">{l.status}</Badge>
                  <span className="w-24 shrink-0 text-right text-steel">{formatPrice(l.price)}</span>
                </>
              )}
            />
          )}

          {tab === 'deals' && (
            <RowList
              loading={dealsLoading}
              items={deals}
              emptyText="No deals yet."
              render={(d) => (
                <>
                  <span className="flex-1 truncate font-bold text-ink">{d.listingId?.title || 'Listing removed'}</span>
                  <Badge tone="outline">{d.status}</Badge>
                  <span className="w-24 shrink-0 text-right text-steel">{formatPrice(d.finalPrice)}</span>
                </>
              )}
            />
          )}

          {tab === 'reviews' && (
            <RowList
              loading={reviewsLoading}
              items={reviews}
              emptyText="No reviews yet."
              render={(r) => (
                <>
                  <span className="w-8 shrink-0 font-display text-[18px] leading-none text-ink">{r.rating}★</span>
                  <span className="flex-1 truncate text-ink/80">{r.comment || <em className="text-steel">No comment.</em>}</span>
                  <span className="w-24 shrink-0 truncate text-right text-steel">{r.reviewerId?.name}</span>
                </>
              )}
            />
          )}
        </div>

        {/* Deleting is admin-only and irreversible, so it sits at the
            bottom of the detail page behind a typed confirmation rather
            than as a button in the user table — a destructive action one
            stray click away from a list of rows is how the wrong record
            gets deleted. Banning is the recoverable option above. */}
        {me?.role === 'admin' && user.role !== 'admin' && (
          <div className="mt-6 border-[3px] border-crimson bg-paper-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-extrabold text-ink">Delete this account</p>
                <p className="meta mt-0.5 max-w-lg leading-relaxed">
                  Removes {user.name} and everything of theirs the student site shows — listings,
                  deals, chats, reviews, community posts. Ban them instead if you only need them
                  off the site.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setConfirmText('');
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={3} /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={banOpen}
        onClose={() => setBanOpen(false)}
        caption="They will be told"
        title={`Suspend ${user.name}?`}
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[12.5px] font-semibold leading-relaxed text-ink/80">
            Their listings and community posts come off the page, nobody can start a new
            conversation with them, and they cannot post or message. Nothing is deleted —
            unbanning puts it all back.
          </p>

          <Textarea
            label="Reason (shown to them, optional)"
            rows={3}
            placeholder="What they did. They see this word for word."
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />

          <Button
            variant="primary"
            size="lg"
            loading={setBlocked.isPending}
            onClick={() => setBlocked.mutate({ blocked: true, reason: banReason.trim() })}
            className="w-full"
          >
            Suspend account
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        caption="This cannot be undone"
        title={`Delete ${user.name}?`}
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[12.5px] font-semibold leading-relaxed text-ink/80">
            This permanently removes their account, listings, deals, offers, reviews, chats,
            saved items, community posts, events and notifications.
          </p>
          <p className="text-[12.5px] font-semibold leading-relaxed text-ink/80">
            Records shared with someone else go too — the other side of a chat or a deal loses
            their copy as well, because half a conversation is not worth keeping.
          </p>

          <Input
            label={`Type ${user.collegeEmail} to confirm`}
            placeholder={user.collegeEmail}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />

          <Button
            variant="primary"
            size="lg"
            loading={remove.isPending}
            disabled={confirmText.trim().toLowerCase() !== user.collegeEmail.toLowerCase()}
            onClick={() => remove.mutate()}
            className="w-full"
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </>
  );
}

function Stat({ label, value, small }) {
  return (
    <div>
      <p className="label-xs">{label}</p>
      <p className={small ? 'text-[13px] font-bold text-ink' : 'font-display text-[24px] leading-none text-ink'}>
        {value}
      </p>
    </div>
  );
}

function RowList({ loading, items, emptyText, render }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <p className="meta py-6 text-center">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item._id} className="flex items-center gap-3 border-b-2 border-ink/10 pb-2 text-[12.5px] font-semibold last:border-b-0 last:pb-0">
          {render(item)}
        </div>
      ))}
    </div>
  );
}
