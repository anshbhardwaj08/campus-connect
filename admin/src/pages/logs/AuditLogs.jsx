// The last 200 lines of `logs/combined.log` — every request morgan logged,
// plus anything winstonLogger.error() wrote (auth failures, unhandled
// errors). Real data with zero seeding needed: the server logs every
// request in this whole admin session already.
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import adminApi from '../../services/adminApi';
import AdminNavbar from '../../components/layout/AdminNavbar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

const LEVEL_TONE = { error: 'crimson', warn: 'outline', info: 'paper' };

// morgan's `dev` format colours its output with ANSI escapes, and winston
// writes the line to the file verbatim. In a terminal they are invisible;
// in HTML they render as litter — "[0mGET /api/v1/listings [36m304[0m".
const stripAnsi = (s = '') => String(s).replace(/\[\d+m/g, '');

export default function AuditLogs() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () => adminApi.get('/admin/logs').then((r) => r.data.data.logs),
  });

  const logs = [...(data || [])].reverse(); // newest first

  return (
    <>
      <AdminNavbar
        title="Logs"
        blurb={`Last ${logs.length} lines from the server.`}
        actions={
          <Button variant="paper" size="sm" loading={isFetching} onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} /> Refresh
          </Button>
        }
      />

      <div className="p-6">
        <div className="border-[3px] border-ink bg-paper-3">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b-2 border-ink/10 p-2.5">
                <Skeleton className="h-5" />
              </div>
            ))}

          {!isLoading && !logs.length && (
            <div className="px-4 py-14 text-center">
              <p className="text-[13px] font-extrabold text-ink">No log file yet.</p>
              <p className="meta mt-1">Nothing has written to logs/combined.log.</p>
            </div>
          )}

          {logs.map((log, i) => (
            <div
              key={i}
              className="flex items-start gap-3 border-b-2 border-ink/10 px-3 py-2 font-mono text-[11.5px] last:border-b-0"
            >
              <span className="shrink-0 pt-0.5 text-steel">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
              </span>
              <Badge tone={LEVEL_TONE[log.level] || 'paper'} className="mt-0.5 shrink-0 !font-mono">
                {log.level || 'log'}
              </Badge>
              <span className="min-w-0 flex-1 break-all font-sans font-semibold text-ink">
                {stripAnsi(log.message)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
