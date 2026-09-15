// Restores the signed-in user on a page load.
//
// The access token lives in an httpOnly cookie, which JavaScript cannot
// read — so the browser still holds a valid session after a refresh while
// Redux, which is memory-only, has forgotten all about it. Without this the
// masthead shows "Sign in" to someone who is already signed in, and every
// `isAuthenticated` check silently fails until they log in again.
//
// So on boot: ask the server who we are. A 401 just means "nobody", which
// is a normal answer, not an error.

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import api from '../services/api';
import { setCredentials, sessionChecked } from '../store/slices/authSlice';

export const useSessionRestore = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get('/users/me');
        const user = res.data?.data?.user;
        if (!cancelled && user) dispatch(setCredentials({ user, token: null }));
      } catch {
        // Not signed in, or the refresh token is spent. Either way there is
        // nothing to restore and nothing worth telling the user about.
      } finally {
        // `ready` unblocks ProtectedRoute either way — "nobody" is an answer.
        if (!cancelled) dispatch(sessionChecked());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
};

export default useSessionRestore;
