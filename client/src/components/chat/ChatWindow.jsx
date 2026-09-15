// One open thread: the listing it concerns, the messages, and the composer.
//
// Messages arrive two ways and both have to be handled. History comes from
// REST; anything sent while the thread is open arrives over the socket. The
// socket is the sending path too, so a message you send comes back to you
// through the same `chat:message` event rather than being appended locally
// — one source of truth, and no duplicate on echo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, IndianRupee, ArrowLeft } from 'lucide-react';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { getSocket } from '../../services/socket';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import MessageBubble from './MessageBubble';
import ReportModal from '../report/ReportModal';
import formatPrice from '../../utils/formatPrice';

const SUBJECT_LABEL = {
  lookingfor: 'Wanted',
  carpool: 'Ride',
  lostfound: 'Lost & found',
};

export default function ChatWindow({ conversation, currentUserId, onBack }) {
  // Messages arrive from two places, so only the live ones are state and the
  // combined list is derived — pushing fetched history into state from an
  // effect just causes an extra render and a stale window in between.
  //
  // ChatPage keys this component by conversation id, so switching threads
  // remounts it with empty `live` rather than needing a reset effect.
  const [live, setLive] = useState([]);
  const [draft, setDraft] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [reporting, setReporting] = useState(null); // the message being reported
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const conversationId = conversation?._id;
  const other = conversation?.participants?.find((p) => String(p._id) !== String(currentUserId));
  const listing = conversation?.listingId;
  const isSeller = listing && String(listing.sellerId || '') === String(currentUserId);

  // History. Server returns newest-first for pagination, so flip it.
  const { data: history } = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () =>
      api
        .get(`/chat/conversations/${conversationId}/messages`, { params: { limit: 50 } })
        .then((r) => r.data.data.messages),
    enabled: Boolean(conversationId),
  });

  const messages = useMemo(() => {
    const base = history ? [...history].reverse() : [];
    const seen = new Set(base.map((m) => m._id));
    return [...base, ...live.filter((m) => !seen.has(m._id))];
  }, [history, live]);

  // Join the room, listen, and mark what is already here as read.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    socket.emit('conversation:join', conversationId);
    api.patch(`/chat/conversations/${conversationId}/read`).catch(() => {});

    const onMessage = (msg) => {
      if (String(msg.conversationId) !== String(conversationId)) return;
      setLive((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:offer', onMessage);

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('chat:message', onMessage);
      socket.off('chat:offer', onMessage);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    const socket = getSocket();
    if (!text || !socket || !conversationId) return;
    socket.emit('chat:message', { conversationId, text, type: 'text' });
    setDraft('');
  };

  const sendOffer = () => {
    const amount = Number(offerAmount);
    const socket = getSocket();
    if (!amount || amount < 0 || !socket) return;
    socket.emit('chat:offer', { conversationId, offerAmount: amount });
    setOfferAmount('');
    setOfferOpen(false);
  };

  // Accepting an offer is the moment a conversation becomes a transaction:
  // it opens the actual Deal, which is what carries the verify code and,
  // later, the reviews. The endpoint derives buyer and seller from the
  // conversation, so neither side can be spoofed from here.
  const acceptOffer = async (amount) => {
    if (!conversationId || accepting) return;
    setAccepting(true);
    try {
      await api.post('/deals/from-conversation', {
        conversationId,
        finalPrice: amount,
        meetupLocation: listing?.pickupLocation || '',
      });
      getSocket()?.emit('deal:agreed', { conversationId });
      queryClient.invalidateQueries({ queryKey: ['deals', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      toast.success('Deal opened. Check Your deals for the code to show at the gate.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not open the deal.'));
    } finally {
      setAccepting(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center border-2 border-dashed border-ink/25 p-8 text-center">
        <div>
          <p className="font-display text-[26px] leading-none text-ink">PICK A THREAD</p>
          <p className="meta mt-2">Or open a listing and message the seller.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full">
      <div className="panel__in panel__in--flush h-full">
        {/* --- Who and what ------------------------------------------- */}
        <div className="flex items-center gap-2.5 border-b-[3px] border-ink bg-paper-2 p-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-paper-3 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
          </button>

          <Avatar name={other?.name} src={other?.avatar} size="sm" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-extrabold leading-tight text-ink">
              {other?.name || 'Unknown'}
            </p>
            {/* A thread is about a listing OR about a community post; the
                latter has no page to link to, so it just says what it is. */}
            {listing ? (
              <Link
                to={`/listings/${listing._id}`}
                className="truncate text-[11px] font-semibold text-steel underline decoration-1 underline-offset-2 hover:text-crimson"
              >
                {listing.title} · {formatPrice(listing.price)}
              </Link>
            ) : (
              conversation.subject?.title && (
                <p className="truncate text-[11px] font-semibold text-steel">
                  {SUBJECT_LABEL[conversation.subject.kind] || 'About'}: {conversation.subject.title}
                </p>
              )
            )}
          </div>

          {conversation.dealStatus && conversation.dealStatus !== 'chatting' && (
            <Badge tone="ink">{conversation.dealStatus}</Badge>
          )}
        </div>

        {/* --- Messages ------------------------------------------------ */}
        <div className="flex min-h-[260px] flex-1 flex-col gap-2.5 overflow-y-auto p-3">
          {messages.length === 0 ? (
            <p className="meta m-auto max-w-[36ch] text-center leading-relaxed">
              Nothing said yet. Ask if it is still available, then agree a time and a gate.
            </p>
          ) : (
            messages.map((m) => {
              const isMine = String(m.senderId) === String(currentUserId);
              return (
                <MessageBubble
                  key={m._id}
                  message={m}
                  isMine={isMine}
                  canAcceptOffer={isSeller && !accepting}
                  onAcceptOffer={acceptOffer}
                  // Nothing to report about your own message.
                  onReport={isMine ? undefined : setReporting}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* --- Composer ------------------------------------------------ */}
        <div className="border-t-[3px] border-ink bg-paper-2 p-2.5">
          {offerOpen && (
            <div className="mb-2.5 flex items-center gap-2">
              <input
                type="number"
                min="0"
                autoFocus
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendOffer()}
                placeholder="Your offer in ₹"
                aria-label="Offer amount"
                className="min-w-0 flex-1 border-2 border-ink bg-paper-3 px-3 py-2 font-sans text-[13.5px] font-semibold text-ink outline-none focus:shadow-hard-crimson"
              />
              <Button variant="ink" size="sm" onClick={sendOffer}>
                Send offer
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOfferOpen((v) => !v)}
              aria-label="Make an offer"
              aria-pressed={offerOpen}
              className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center border-2 border-ink transition-colors ${
                offerOpen ? 'bg-ink text-paper-3' : 'bg-paper-3 text-ink hover:bg-paper-2'
              }`}
            >
              <IndianRupee className="h-4 w-4" strokeWidth={3} />
            </button>

            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Say something"
              aria-label="Message"
              className="min-w-0 flex-1 border-2 border-ink bg-paper-3 px-3 py-2.5 font-sans text-[13.5px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-steel/70 focus:shadow-hard-crimson"
            />

            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center border-2 border-ink bg-crimson text-paper-3 transition-[transform,box-shadow] duration-75 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40"
            >
              <Send className="h-4 w-4" strokeWidth={2.75} />
            </button>
          </div>

          <p className="meta mt-2 leading-snug">
            Meet at the gate. Look it over. Then pay. Never send money in advance.
          </p>
        </div>
      </div>

      <ReportModal
        isOpen={Boolean(reporting)}
        onClose={() => setReporting(null)}
        targetType="message"
        targetId={reporting?._id}
        targetLabel={`this message from ${other?.name || 'them'}`}
      />
    </div>
  );
}
