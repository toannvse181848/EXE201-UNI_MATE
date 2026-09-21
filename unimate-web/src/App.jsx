import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleRoute from './components/RoleRoute';

// Layouts
import UserLayout from './components/UserLayout';
import PartnerLayout from './components/PartnerLayout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Login from './pages/Login';
import Register from './pages/Register';


// User / Student Pages
import UserDiscover from './pages/user/UserDiscover';
import UserVenues from './pages/user/UserVenues';
import UserVouchers from './pages/user/UserVouchers';
import UserMessages from './pages/user/UserMessages';
import UserProfile from './pages/user/UserProfile';

// Partner Pages
import Dashboard from './pages/partner/Dashboard';
import VenueManagement from './pages/partner/VenueManagement';
import VoucherManagement from './pages/partner/VoucherManagement';
import QRScanner from './pages/partner/QRScanner';
import PendingReview from './pages/partner/PendingReview';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import VenueModeration from './pages/admin/VenueModeration';
import VoucherOversight from './pages/admin/VoucherOversight';
import ReportQueue from './pages/admin/ReportQueue';

// Smart Home / Default Redirect based on current role
function RootRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.role === 'partner') {
    return <Navigate to="/partner/dashboard" replace />;
  }
  return <Navigate to="/user/discover" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />


          {/* 🎓 User / Student Portal Routes */}
          <Route
            path="/user"
            element={
              <RoleRoute allowedRole="user">
                <UserLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="/user/discover" replace />} />
            <Route path="discover" element={<UserDiscover />} />
            <Route path="venues" element={<UserVenues />} />
            <Route path="vouchers" element={<UserVouchers />} />
            <Route path="messages" element={<UserMessages />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>

          {/* ☕ Partner Portal Routes */}
          <Route
            path="/partner"
            element={
              <RoleRoute allowedRole="partner">
                <PartnerLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="venues" element={<VenueManagement />} />
            <Route path="vouchers" element={<VoucherManagement />} />
            <Route path="qr-scanner" element={<QRScanner />} />
            <Route path="pending-review" element={<PendingReview />} />
          </Route>

          {/* 🛡️ Admin Management Portal Routes */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRole="admin">
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="venues" element={<VenueModeration />} />
            <Route path="vouchers" element={<VoucherOversight />} />
            <Route path="reports" element={<ReportQueue />} />
          </Route>

          {/* Root & Fallback Dynamic Routing */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
