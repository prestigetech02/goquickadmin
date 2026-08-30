import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  Bike,
  IdCard,
  Users,
  CreditCard,
  Scale,
  BarChart3,
  FileText,
  Bell,
  DollarSign,
  Settings,
  Ticket,
  UserCog,
  ScrollText,
  HelpCircle,
  LogOut,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { getVisiblePages, type PageKey } from '@/lib/adminNavigation';
import { adminDisplayName, adminInitial, adminRoleLabel } from '@/lib/utils';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { Modal } from '@/components/ui/Modal';
import goquickWhiteLogo from '@/assets/goquick-white.png';
import goquickAppIcon from '@/assets/goquick-appicon.png';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  section: string;
}

const NAV_ICONS: Record<PageKey, ReactNode> = {
  dashboard: <LayoutDashboard className="w-[18px] h-[18px]" />,
  errands: <Package className="w-[18px] h-[18px]" />,
  runners: <Bike className="w-[18px] h-[18px]" />,
  kyc: <IdCard className="w-[18px] h-[18px]" />,
  users: <Users className="w-[18px] h-[18px]" />,
  payments: <CreditCard className="w-[18px] h-[18px]" />,
  disputes: <Scale className="w-[18px] h-[18px]" />,
  tickets: <Ticket className="w-[18px] h-[18px]" />,
  analytics: <BarChart3 className="w-[18px] h-[18px]" />,
  blog: <FileText className="w-[18px] h-[18px]" />,
  notifications: <Bell className="w-[18px] h-[18px]" />,
  pricing: <DollarSign className="w-[18px] h-[18px]" />,
  settings: <Settings className="w-[18px] h-[18px]" />,
  'user-management': <UserCog className="w-[18px] h-[18px]" />,
  'system-logs': <ScrollText className="w-[18px] h-[18px]" />,
  support: <HelpCircle className="w-[18px] h-[18px]" />,
  'in-app-notifications': <Bell className="w-[18px] h-[18px]" />,
};

export function Layout({
  currentPage,
  children,
}: {
  currentPage: PageKey;
  children: ReactNode;
}) {
  const navigate = useAdminNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = adminDisplayName(user);
  const avatarLetter = adminInitial(user);
  const roleLabel = adminRoleLabel(user);
  const visibleNavItems: NavItem[] = getVisiblePages(user).map((item) => ({
    key: item.key,
    label: item.label,
    icon: NAV_ICONS[item.key],
    section: item.section ?? 'More',
  }));
  const sections = [...new Set(visibleNavItems.map((item) => item.section))];

  const handleNavigate = (page: PageKey) => {
    navigate(page);
    setMobileOpen(false);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setShowLogoutConfirm(false);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } fixed lg:relative z-40 h-full bg-ink-950 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Logo */}
        <div className={`h-16 border-b border-white/5 flex-shrink-0 ${collapsed ? 'flex items-center justify-center px-3' : 'flex items-center px-5'}`}>
          {!collapsed && (
            <img
              src={goquickWhiteLogo}
              alt="GoQuick"
              className="h-8 w-auto object-contain"
            />
          )}
          {collapsed && (
            <img
              src={goquickAppIcon}
              alt="GoQuick app icon"
              className="h-10 w-10 rounded-2xl object-cover"
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
          {sections.map((section) => (
            <div key={section} className="mb-4">
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">
                  {section}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleNavItems.filter((item) => item.section === section).map((item) => {
                  const active = currentPage === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavigate(item.key)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-brand-600 text-white'
                          : 'text-ink-300 hover:bg-white/5 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-300 hover:bg-error-500/10 hover:text-error-400 transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-ink-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-ink-600 hover:bg-ink-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-lg text-ink-600 hover:bg-ink-50 transition-colors"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <div className="hidden md:flex items-center gap-2 ml-2">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsPopover />
            <div className="flex items-center gap-3 pl-3 border-l border-ink-100">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                {avatarLetter}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-ink-900">{displayName}</p>
                <p className="text-xs text-ink-400 capitalize">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>

    <Modal open={showLogoutConfirm} onClose={() => !loggingOut && setShowLogoutConfirm(false)} title="Log out?" size="sm">
      <p className="text-sm text-ink-600 mb-6">
        You will be signed out of the admin panel. You can sign back in with your email and password.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(false)}
          disabled={loggingOut}
          className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirmLogout()}
          disabled={loggingOut}
          className="flex-1 py-2.5 rounded-xl bg-error-600 text-white text-sm font-semibold hover:bg-error-700 disabled:opacity-60 transition-colors"
        >
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </Modal>
    </>
  );
}
