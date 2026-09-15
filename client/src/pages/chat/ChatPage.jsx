// The inbox. Two panes on desktop, one at a time on mobile.
//
// Handles three ways of arriving:
//   /chat                      — pick a thread
//   /chat?conversation=<id>    — open that thread (notification links)
//   /chat?listing=<id>         — "Message the seller": find or create the
//                                thread for that listing, then open it
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import Skeleton from '../../components/ui/Skeleton';

export default function ChatPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState(params.get('conversation') || null);
  const startedFor = useRef(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data.data.conversations),
  });

  // "Message the seller" lands here with ?listing=<id>. Find or create the
  // thread, then swap the URL for the conversation id so a refresh does not
  // run the create again.
  useEffect(() => {
    const listingId = params.get('listing');
    if (!listingId || startedFor.current === listingId) return;
    startedFor.current = listingId;

    (async () => {
      try {
        const res = await api.post('/chat/conversations', { listingId });
        const conversation = res.data.data.conversation;
        await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        setActiveId(conversation._id);
        setParams({ conversation: conversation._id }, { replace: true });
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not open that conversation.'));
        setParams({}, { replace: true });
      }
    })();
  }, [params, queryClient, setParams]);

  const select = (id) => {
    setActiveId(id);
    setParams({ conversation: id }, { replace: true });
  };

  const active = conversations?.find((c) => String(c._id) === String(activeId)) || null;

  return (
    <PageWrapper>
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          THE <span className="text-crimson">TALK</span>
        </h1>
        <p className="meta mt-2">Agree a price here. Agree a gate. Then go.</p>
      </header>

      <div className="grid gap-[9px] lg:grid-cols-12">
        {/* --- Inbox --------------------------------------------------- */}
        <div className={`lg:col-span-4 ${active ? 'hidden lg:block' : 'block'}`}>
          <div className="panel">
            <div className="panel__in panel__in--flush">
              <p className="label-xs border-b-2 border-ink/10 p-2.5">Your threads</p>

              {isLoading ? (
                <div className="flex flex-col gap-2 p-2.5">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <ConversationList
                  conversations={conversations || []}
                  activeId={activeId}
                  currentUserId={user?._id}
                  onSelect={select}
                />
              )}
            </div>
          </div>
        </div>

        {/* --- Open thread --------------------------------------------- */}
        <div className={`lg:col-span-8 ${active ? 'block' : 'hidden lg:block'}`}>
          <ChatWindow
            key={activeId || 'none'}
            conversation={active}
            currentUserId={user?._id}
            onBack={() => {
              setActiveId(null);
              setParams({}, { replace: true });
            }}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
