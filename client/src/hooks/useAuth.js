// Convenience hook exposing auth state and actions from the Redux store
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout as logoutAction } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);

  const login = (user, token) => dispatch(setCredentials({ user, token }));
  const logout = () => dispatch(logoutAction());

  return { user, token, isAuthenticated, login, logout };
};

export default useAuth;
