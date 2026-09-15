// Convenience hook exposing admin auth state and actions from the Redux store
import { useDispatch, useSelector } from 'react-redux';
import { setAdminCredentials, adminLogout } from '../store/slices/adminAuthSlice';

export const useAdminAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, ready } = useSelector((state) => state.adminAuth);

  const login = (user) => dispatch(setAdminCredentials({ user }));
  const logout = () => dispatch(adminLogout());

  return { user, isAuthenticated, ready, login, logout };
};

export default useAdminAuth;
