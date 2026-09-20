import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import PartnerLayout from './components/PartnerLayout';
import AdminLayout from './components/AdminLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/partner/Dashboard';
import VenueManagement from './pages/partner/VenueManagement';
import VoucherManagement from './pages/partner/VoucherManagement';
import QRScanner from './pages/partner/QRScanner';
import PendingReview from './pages/partner/PendingReview';

import AdminDashboard from './pages/admin/AdminDashboard';
import VenueModeration from './pages/admin/VenueModeration';
import VoucherOversight from './pages/admin/VoucherOversight';
import ReportQueue from './pages/admin/ReportQueue';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Partner Portal Routes */}
          <Route path="/partner" element={<PartnerLayout />}>
            <Route index element={<Navigate to="/partner/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="venues" element={<VenueManagement />} />
            <Route path="vouchers" element={<VoucherManagement />} />
            <Route path="qr-scanner" element={<QRScanner />} />
            <Route path="pending-review" element={<PendingReview />} />
          </Route>

          {/* Admin Management Portal Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="venues" element={<VenueModeration />} />
            <Route path="vouchers" element={<VoucherOversight />} />
            <Route path="reports" element={<ReportQueue />} />
          </Route>

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
