// All application routes, defined with React Router v6
import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyEmail from '../pages/auth/VerifyEmail';
import VerifyPhone from '../pages/auth/VerifyPhone';

import Home from '../pages/home/Home';
import Browse from '../pages/listings/Browse';
import ListingDetailPage from '../pages/listings/ListingDetailPage';
import PostListing from '../pages/listings/PostListing';
import EditListing from '../pages/listings/EditListing';

import ChatPage from '../pages/chat/ChatPage';

import MyProfile from '../pages/profile/MyProfile';
import PublicProfile from '../pages/profile/PublicProfile';
import Settings from '../pages/profile/Settings';

import Saved from '../pages/saved/Saved';
import MyDeals from '../pages/deals/MyDeals';

import Events from '../pages/community/Events';
import LostFound from '../pages/community/LostFound';
import Carpool from '../pages/community/Carpool';
import LookingFor from '../pages/community/LookingFor';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-phone" element={<VerifyPhone />} />

      <Route path="/browse" element={<Browse />} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />

      <Route path="/users/:id" element={<PublicProfile />} />

      <Route path="/events" element={<Events />} />
      <Route path="/lost-found" element={<LostFound />} />
      <Route path="/carpool" element={<Carpool />} />
      <Route path="/looking-for" element={<LookingFor />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/listings/new" element={<PostListing />} />
        <Route path="/listings/:id/edit" element={<EditListing />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/deals" element={<MyDeals />} />
      </Route>

      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}
