// "Reply" on a community post. A want, a ride and a found calculator are all
// useless without a way to answer them — this opens the same chat thread a
// listing does, just about a different kind of thing.
//
// Hides itself on your own post, and sends you to sign in if you are not.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function MessageButton({
  subjectType, // 'lookingfor' | 'carpool' | 'lostfound'
  subjectId,
  ownerId,
  label = 'Reply',
  className = '',
}) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Nothing to say to yourself.
  if (user && String(ownerId) === String(user._id)) return null;

  const open = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in to message people on the page.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/chat/conversations', { subjectType, subjectId });
      const conversation = res.data.data.conversation;
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      navigate(`/chat?conversation=${conversation._id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not open that conversation.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      loading={loading}
      onClick={open}
      className={`!min-h-[34px] !px-2.5 !text-[13px] ${className}`}
    >
      <MessageCircle className="h-3.5 w-3.5" strokeWidth={3} /> {label}
    </Button>
  );
}
