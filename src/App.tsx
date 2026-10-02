import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AdminNavigationProvider } from '@/context/AdminNavigationContext';
import { AdminOpsRealtimeProvider } from '@/context/AdminOpsRealtimeContext';
import { Layout } from '@/components/Layout';
import { Admin2Layout } from '@/components/admin2/Admin2Layout';
import { Admin2OverviewPage } from '@/pages/admin2/Admin2OverviewPage';
import { Admin2UsersPage } from '@/pages/admin2/Admin2UsersPage';
import { Admin2ErrandDetailsPage } from '@/pages/admin2/Admin2ErrandDetailsPage';
import { Admin2ErrandsPage } from '@/pages/admin2/Admin2ErrandsPage';
import { Admin2UserDetailsPage } from '@/pages/admin2/Admin2UserDetailsPage';
import { Admin2RunnerDetailsPage } from '@/pages/admin2/Admin2RunnerDetailsPage';
import { Admin2RunnersPage } from '@/pages/admin2/Admin2RunnersPage';
import { Admin2TransactionsPage } from '@/pages/admin2/Admin2TransactionsPage';
import { Admin2WithdrawalsPage } from '@/pages/admin2/Admin2WithdrawalsPage';
import { Admin2ZonesPage } from '@/pages/admin2/Admin2ZonesPage';
import { Admin2NotificationsPage } from '@/pages/admin2/Admin2NotificationsPage';
import { Admin2VerificationsPage } from '@/pages/admin2/Admin2VerificationsPage';
import { Admin2DisputesPage } from '@/pages/admin2/Admin2DisputesPage';
import { Admin2RevenuePage } from '@/pages/admin2/Admin2RevenuePage';
import { Admin2AnalyticsPage } from '@/pages/admin2/Admin2AnalyticsPage';
import { Admin2SettingsPage } from '@/pages/admin2/Admin2SettingsPage';
import { Admin2BlogPage } from '@/pages/admin2/Admin2BlogPage';
import { Admin2BlogEditorPage } from '@/pages/admin2/Admin2BlogEditorPage';
import { Admin2CouponsPage } from '@/pages/admin2/Admin2CouponsPage';
import { Admin2SupportPage } from '@/pages/admin2/Admin2SupportPage';
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
import { CompanyRevenuePage } from '@/pages/CompanyRevenuePage';
import { DisputesPage } from '@/pages/DisputesPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { BlogPage } from '@/pages/BlogPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PricingPage } from '@/pages/PricingPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { ZonesPage } from '@/pages/ZonesPage';
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
      case 'company-revenue':
        return <CompanyRevenuePage />;
      case 'disputes':
        return <DisputesPage />;
      case 'tickets':
        return <TicketsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'blog':
        return <BlogPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'pricing':
        return <PricingPage />;
      case 'zones':
        return <ZonesPage />;
      case 'coupons':
        return <CouponsPage />;
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
      <AdminOpsRealtimeProvider>
        {page === 'admin2' ||
        page === 'admin2-users' ||
        page === 'admin2-user' ||
        page === 'admin2-errands' ||
        page === 'admin2-errand' ||
        page === 'admin2-runners' ||
        page === 'admin2-runner' ||
        page === 'admin2-transactions' ||
        page === 'admin2-withdrawals' ||
        page === 'admin2-zones' ||
        page === 'admin2-notifications' ||
        page === 'admin2-verifications' ||
        page === 'admin2-disputes' ||
        page === 'admin2-revenue' ||
        page === 'admin2-analytics' ||
        page === 'admin2-settings' ||
        page === 'admin2-blog' ||
        page === 'admin2-blog-post' ||
        page === 'admin2-coupons' ||
        page === 'admin2-support' ? (
          <Admin2Layout>
            {page === 'admin2' ? <Admin2OverviewPage /> : null}
            {page === 'admin2-users' ? <Admin2UsersPage /> : null}
            {page === 'admin2-user' ? <Admin2UserDetailsPage /> : null}
            {page === 'admin2-errands' ? <Admin2ErrandsPage /> : null}
            {page === 'admin2-errand' ? <Admin2ErrandDetailsPage /> : null}
            {page === 'admin2-runners' ? <Admin2RunnersPage /> : null}
            {page === 'admin2-runner' ? <Admin2RunnerDetailsPage /> : null}
            {page === 'admin2-transactions' ? <Admin2TransactionsPage /> : null}
            {page === 'admin2-withdrawals' ? <Admin2WithdrawalsPage /> : null}
            {page === 'admin2-zones' ? <Admin2ZonesPage /> : null}
            {page === 'admin2-notifications' ? <Admin2NotificationsPage /> : null}
            {page === 'admin2-verifications' ? <Admin2VerificationsPage /> : null}
            {page === 'admin2-disputes' ? <Admin2DisputesPage /> : null}
            {page === 'admin2-revenue' ? <Admin2RevenuePage /> : null}
            {page === 'admin2-analytics' ? <Admin2AnalyticsPage /> : null}
            {page === 'admin2-settings' ? <Admin2SettingsPage /> : null}
            {page === 'admin2-blog' ? <Admin2BlogPage /> : null}
            {page === 'admin2-blog-post' ? <Admin2BlogEditorPage /> : null}
            {page === 'admin2-coupons' ? <Admin2CouponsPage /> : null}
            {page === 'admin2-support' ? <Admin2SupportPage /> : null}
          </Admin2Layout>
        ) : (
          <Layout currentPage={page}>
            {renderPage()}
          </Layout>
        )}
      </AdminOpsRealtimeProvider>
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
