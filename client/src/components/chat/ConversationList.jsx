// The inbox rail. One row per thread: who you are talking to, which listing
// it is about, and the last thing said.
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { timeAgo } from '../../utils/timeAgo';

export default function ConversationList({ conversations, activeId, currentUserId, onSelect }) {
  if (!conversations.length) {
    return (
      <div className="border-2 border-dashed border-ink/25 px-4 py-10 text-center">
        <p className="text-[13px] font-bold text-ink">No conversations yet.</p>
        <p className="meta mt-1 leading-relaxed">
          Open a listing and message the seller. Threads show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((c) => {
        const other = c.participants?.find((p) => String(p._id) !== String(currentUserId));
        const isActive = String(c._id) === String(activeId);

        return (
          <button
            key={c._id}
            type="button"
            onClick={() => onSelect(c._id)}
            aria-current={isActive}
            className={`flex w-full items-start gap-2.5 border-b-2 border-ink/10 p-2.5 text-left transition-colors last:border-b-0 ${
              isActive ? 'bg-paper-2' : 'bg-transparent hover:bg-paper-2/50'
            }`}
          >
            <Avatar name={other?.name} src={other?.avatar} size="sm" />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={`truncate text-[13px] ${
                    c.unreadCount > 0 ? 'font-extrabold text-ink' : 'font-bold text-ink/80'
                  }`}
                >
                  {other?.name || 'Unknown'}
                </p>
                <span className="flex shrink-0 items-center gap-1.5">
                  {/* Unread reads as a number in an ink chip — same
                      treatment as the masthead badge. */}
                  {c.unreadCount > 0 && (
                    <span className="flex h-[17px] min-w-[17px] items-center justify-center border-2 border-ink bg-ink px-1 text-[9.5px] font-extrabold leading-none text-paper-3">
                      {c.unreadCount > 9 ? '9+' : c.unreadCount}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-steel">
                    {c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}
                  </span>
                </span>
              </div>

              <p className="truncate text-[11.5px] font-semibold text-steel">
                {c.listingId?.title || c.subject?.title || 'Post removed'}
              </p>

              {c.lastMessage && (
                <p className="mt-0.5 truncate text-[11.5px] font-medium text-ink/70">
                  {c.lastMessage}
                </p>
              )}

              {c.dealStatus && c.dealStatus !== 'chatting' && (
                <Badge tone={c.dealStatus === 'completed' ? 'ink' : 'outline'} className="mt-1.5">
                  {c.dealStatus}
                </Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
