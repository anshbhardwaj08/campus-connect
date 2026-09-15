// One report, as a row: who reported what, why, and what to do about it.
//
// The server resolves `targetId` to a label per type (a report can point at
// a listing, a user or a message — three different collections, so no one
// populate reaches it). When the label is missing the target has already
// been deleted, which the row says outright rather than leaving a bare id.
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { timeAgo } from '../../utils/timeAgo';

const TARGET_LABEL = { listing: 'Listing', user: 'User', message: 'Message' };

export default function ReportDetail({ report, onResolve, onDismiss, busy }) {
  const { reporterId: reporter, targetType, targetLabel, reason, description, createdAt } = report;

  return (
    <div className="border-[3px] border-ink bg-paper-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={reporter?.name} size="sm" />
          <div>
            <p className="text-[12.5px] font-extrabold leading-tight text-ink">
              {reporter?.name || 'Unknown'} reported
            </p>
            <p className="meta">{timeAgo(createdAt)}</p>
          </div>
        </div>

        <Badge tone="outline">{TARGET_LABEL[targetType] || targetType}</Badge>
      </div>

      <div className="mt-3 border-t-2 border-ink/10 pt-3">
        <p className="text-[13px] font-extrabold text-ink">{reason}</p>
        {description && (
          <p className="mt-1 text-[12.5px] font-medium leading-snug text-ink/75">{description}</p>
        )}
        <p className="meta mt-2">
          {targetLabel ? (
            <>
              {TARGET_LABEL[targetType] || targetType}:{' '}
              <span className="font-bold text-ink">{targetLabel}</span>
            </>
          ) : (
            <em>That {targetType} has already been deleted.</em>
          )}
        </p>
      </div>

      <div className="mt-3 flex gap-2 border-t-2 border-ink/10 pt-3">
        <Button variant="ink" size="sm" className="!text-[13px]" disabled={busy} onClick={onResolve}>
          Resolve
        </Button>
        <Button variant="paper" size="sm" className="!text-[13px]" disabled={busy} onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
