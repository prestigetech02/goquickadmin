import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AdminNavigationProvider } from '@/context/AdminNavigationContext';
import { Layout } from '@/components/Layout';
import {
  canAccessPage,
  getDefaultPageForUser,
  getPageFromPathname,
  getPagePath,
} from '@/lib/adminNavigation';
import { LoginPage } from '@/pages/LoginPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ErrandsPage } from '@/pages/ErrandsPage';
import { RunnersPage } from '@/pages/RunnersPage';
import { KycPage } from '@/pages/KycPage';
import { UsersPage } from '@/pages/UsersPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { DisputesPage } from '@/pages/DisputesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { BlogPage } from '@/pages/BlogPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PricingPage } from '@/pages/PricingPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UserManagementPage } from '@/pages/UserManagementPage';
import { SystemLogsPage } from '@/pages/SystemLogsPage';
import { SupportPage } from '@/pages/SupportPage';
import { InAppNotificationsPage } from '@/pages/InAppNotificationsPage';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const page = getPageFromPathname(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          <p className="text-sm text-ink-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.must_change_password) {
    return (
      <Routes>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    );
  }

  if (!page || !canAccessPage(user, page)) {
    return <Navigate to={getPagePath(getDefaultPageForUser(user))} replace />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage />;
      case 'errands':
        return <ErrandsPage />;
      case 'runners':
        return <RunnersPage />;
      case 'kyc':
        return <KycPage />;
      case 'users':
        return <UsersPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'disputes':
        return <DisputesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'blog':
        return <BlogPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'pricing':
        return <PricingPage />;
      case 'settings':
        return <SettingsPage />;
      case 'user-management':
        return <UserManagementPage />;
      case 'system-logs':
        return <SystemLogsPage />;
      case 'support':
        return <SupportPage />;
      case 'in-app-notifications':
        return <InAppNotificationsPage />;
      default:
        return <Navigate to={getPagePath(getDefaultPageForUser(user))} replace />;
    }
  };

  return (
    <AdminNavigationProvider>
      <Layout currentPage={page}>
        {renderPage()}
      </Layout>
    </AdminNavigationProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
