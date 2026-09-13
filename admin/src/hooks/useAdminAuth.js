// Convenience hook exposing admin auth state and actions from the Redux store
import { useDispatch, useSelector } from 'react-redux';
import { setAdminCredentials, adminLogout } from '../store/slices/adminAuthSlice';

export const useAdminAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state) => state.adminAuth);

  const login = (user, token) => dispatch(setAdminCredentials({ user, token }));
  const logout = () => dispatch(adminLogout());

  return { user, token, isAuthenticated, login, logout };
};

export default useAdminAuth;
