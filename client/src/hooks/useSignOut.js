// Signing out, in one place — the masthead menu and Settings both use it.
//
// The server call clears the httpOnly cookies; the Redux clear is what the
// UI actually reacts to. If the server call fails (dead session, no network)
// we clear locally anyway: leaving someone "signed in" against a session
// that no longer works helps nobody.
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../services/api';
import { useAuth } from './useAuth';
import { disconnectSocket } from '../services/socket';

export const useSignOut = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async ({ redirectTo = '/login', silent = false } = {}) => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clearing locally regardless — see above.
    }

    disconnectSocket();
    logout();
    // Otherwise the next person to sign in on this browser sees the previous
    // user's cached conversations, saved items and deals until each refetches.
    queryClient.clear();

    if (!silent) toast.success('Signed out.');
    navigate(redirectTo);
  };
};

export default useSignOut;
