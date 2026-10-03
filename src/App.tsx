import { useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AdminNavigationProvider } from '@/context/AdminNavigationContext';
import { AdminOpsRealtimeProvider } from '@/context/AdminOpsRealtimeContext';
import { Admin2Layout } from '@/components/admin2/Admin2Layout';
import { AdminApprovalPrompt } from '@/components/AdminApprovalPrompt';
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
import { Admin2AdminsPage } from '@/pages/admin2/Admin2AdminsPage';
import { Admin2InboxPage } from '@/pages/admin2/Admin2InboxPage';
import { Admin2AuditLogPage } from '@/pages/admin2/Admin2AuditLogPage';
import { Admin2SystemHealthPage } from '@/pages/admin2/Admin2SystemHealthPage';
import { Admin2HelpPage } from '@/pages/admin2/Admin2HelpPage';
import {
  canAccessPage,
  classicRedirectHref,
  getDefaultPageForUser,
  getPageFromPathname,
  getPagePath,
  type PageKey,
} from '@/lib/adminNavigation';
import { LoginPage } from '@/pages/LoginPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

const PAGES: Partial<Record<PageKey, () => ReactNode>> = {
  admin2: () => <Admin2OverviewPage />,
  'admin2-users': () => <Admin2UsersPage />,
  'admin2-user': () => <Admin2UserDetailsPage />,
  'admin2-errands': () => <Admin2ErrandsPage />,
  'admin2-errand': () => <Admin2ErrandDetailsPage />,
  'admin2-runners': () => <Admin2RunnersPage />,
  'admin2-runner': () => <Admin2RunnerDetailsPage />,
  'admin2-transactions': () => <Admin2TransactionsPage />,
  'admin2-withdrawals': () => <Admin2WithdrawalsPage />,
  'admin2-zones': () => <Admin2ZonesPage />,
  'admin2-notifications': () => <Admin2NotificationsPage />,
  'admin2-verifications': () => <Admin2VerificationsPage />,
  'admin2-disputes': () => <Admin2DisputesPage />,
  'admin2-revenue': () => <Admin2RevenuePage />,
  'admin2-analytics': () => <Admin2AnalyticsPage />,
  'admin2-settings': () => <Admin2SettingsPage />,
  'admin2-blog': () => <Admin2BlogPage />,
  'admin2-blog-post': () => <Admin2BlogEditorPage />,
  'admin2-coupons': () => <Admin2CouponsPage />,
  'admin2-support': () => <Admin2SupportPage />,
  'admin2-admins': () => <Admin2AdminsPage />,
  'admin2-inbox': () => <Admin2InboxPage />,
  'admin2-audit': () => <Admin2AuditLogPage />,
  'admin2-health': () => <Admin2SystemHealthPage />,
  'admin2-help': () => <Admin2HelpPage />,
};

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

  const classicTarget = page ? classicRedirectHref(page, location.search) : null;
  if (classicTarget) {
    return <Navigate to={classicTarget} replace />;
  }

  const render = page ? PAGES[page] : undefined;
  if (!page || !render || !canAccessPage(user, page)) {
    return <Navigate to={getPagePath(getDefaultPageForUser(user))} replace />;
  }

  return (
    <AdminNavigationProvider>
      <AdminOpsRealtimeProvider>
        <Admin2Layout>{render()}</Admin2Layout>
        <AdminApprovalPrompt />
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
