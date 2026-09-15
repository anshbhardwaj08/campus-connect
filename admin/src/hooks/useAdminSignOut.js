// Signing out, in one place — mirrors client/src/hooks/useSignOut.js.
// Clears the server cookies and the local session regardless of whether the
// server call succeeds; leaving someone "signed in" against a dead session
// helps nobody.
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import adminApi from '../services/adminApi';
import { useAdminAuth } from './useAdminAuth';

export const useAdminSignOut = () => {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async () => {
    try {
      await adminApi.post('/auth/logout');
    } catch {
      // Clearing locally regardless — see above.
    }

    logout();
    queryClient.clear();
    toast.success('Signed out.');
    navigate('/login');
  };
};

export default useAdminSignOut;
