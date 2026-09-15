// Restores the signed-in admin on a page load — mirrors
// client/src/hooks/useSessionRestore.js. The session cookie is httpOnly, so
// JS can't read it directly; Redux only knows the user again once this asks
// the server. A 401 just means "nobody signed in", which is a normal answer.
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import adminApi from '../services/adminApi';
import { setAdminCredentials, adminSessionChecked } from '../store/slices/adminAuthSlice';

export const useAdminSessionRestore = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await adminApi.get('/users/me');
        const user = res.data?.data?.user;
        // A student's session is valid but has no business here — leave
        // adminAuth unauthenticated so AdminProtectedRoute sends them to
        // /login rather than letting a non-admin session read as signed in.
        if (!cancelled && user && ['admin', 'moderator'].includes(user.role)) {
          dispatch(setAdminCredentials({ user }));
        }
      } catch {
        // Not signed in. Nothing to restore.
      } finally {
        if (!cancelled) dispatch(adminSessionChecked());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
};

export default useAdminSessionRestore;
