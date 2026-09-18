// All application routes, defined with React Router v6.
//
// Every page is a lazy import. Without this the whole product ships as one
// file: opening /login downloaded the chat, the community pages, the deal
// handshake and the admin-sized chart code along with it. Each page is now
// its own chunk, fetched the first time somebody goes there.
//
// Anything several pages share — Panel, Button, the masthead, motion.js —
// is imported normally by those pages and the bundler hoists it into a
// shared chunk that loads once. Do NOT lazy-load shared components: that
// trades one download for a round trip on every page that uses them.
//
// ProtectedRoute and the fallback are eager on purpose. They are tiny, and
// both are needed to render the very first frame — putting them behind a
// fetch would delay the thing whose job is to cover a fetch.
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';
import RouteFallback from '../components/layout/RouteFallback';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail'));
const VerifyPhone = lazy(() => import('../pages/auth/VerifyPhone'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const Suspended = lazy(() => import('../pages/auth/Suspended'));

const Home = lazy(() => import('../pages/home/Home'));
const Browse = lazy(() => import('../pages/listings/Browse'));
const ListingDetailPage = lazy(() => import('../pages/listings/ListingDetailPage'));
const PostListing = lazy(() => import('../pages/listings/PostListing'));
const EditListing = lazy(() => import('../pages/listings/EditListing'));

const ChatPage = lazy(() => import('../pages/chat/ChatPage'));

const MyProfile = lazy(() => import('../pages/profile/MyProfile'));
const PublicProfile = lazy(() => import('../pages/profile/PublicProfile'));
const Settings = lazy(() => import('../pages/profile/Settings'));

const Saved = lazy(() => import('../pages/saved/Saved'));
const MyDeals = lazy(() => import('../pages/deals/MyDeals'));

const Events = lazy(() => import('../pages/community/Events'));
const LostFound = lazy(() => import('../pages/community/LostFound'));
const Carpool = lazy(() => import('../pages/community/Carpool'));
const LookingFor = lazy(() => import('../pages/community/LookingFor'));

const NotFound = lazy(() => import('../pages/NotFound'));

export default function AppRoutes() {
  return (
    // One boundary around the whole tree rather than one per route: a route
    // change swaps the page, so there is nothing underneath worth keeping
    // on screen separately.
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-phone" element={<VerifyPhone />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/suspended" element={<Suspended />} />

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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
