import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  BarChart2,
  Bell,
  Bike,
  Building2,
  CircleHelp,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageSquareWarning,
  Newspaper,
  PackageCheck,
  Settings,
  Ticket,
  UserCog,
  Users,
  WalletCards,
  X,
  type LucideProps,
} from 'lucide-react';
import { fetchDashboardBadges } from '@/api/adminDashboardApi';
import { fetchInAppUnreadCount } from '@/api/adminInAppNotificationsApi';
import { useAuth } from '@/context/AuthContext';
import { useAdminOpsRealtimeStatus } from '@/context/AdminOpsRealtimeContext';
import { canAccessPage, getPagePath, type PageKey } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { DashboardBadges } from '@/types/api';
import goquickLogo from '@/assets/admin2/goquick-logo.png';

type SidebarItem = {
  label: string;
  page: PageKey;
  href?: string;
  /** Extra admin2 path whose sub-pages also highlight this item. */
  activePrefix?: string;
  icon: ComponentType<LucideProps>;
  badge?: keyof DashboardBadges | 'inbox';
};

const SECTIONS: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: 'Operations',
    items: [
      { label: 'Overview', page: 'admin2', icon: LayoutDashboard },
      { label: 'Inbox', page: 'admin2-inbox', icon: Inbox, badge: 'inbox' },
      { label: 'Users', page: 'admin2-users', icon: Users },
      { label: 'Runners', page: 'admin2-runners', icon: Bike },
      { label: 'Verifications', page: 'admin2-verifications', icon: BadgeCheck, badge: 'kyc' },
      { label: 'Errands', page: 'admin2-errands', icon: PackageCheck, badge: 'errands' },
      { label: 'Disputes', page: 'admin2-disputes', icon: MessageSquareWarning, badge: 'disputes' },
      { label: 'Withdrawals', page: 'admin2-withdrawals', icon: WalletCards, badge: 'withdrawals' },
      { label: 'Transactions', page: 'admin2-transactions', icon: ArrowLeftRight },
      { label: 'Service Zones', page: 'admin2-zones', icon: MapPin },
      { label: 'Notifications', page: 'admin2-notifications', icon: Bell },
    ],
  },
  {
    title: 'Financials',
    items: [
      { label: 'Revenue', page: 'admin2-revenue', icon: Building2 },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', page: 'admin2-analytics', icon: BarChart2 },
      { label: 'Coupons', page: 'admin2-coupons', icon: Ticket },
    ],
  },
  {
    title: 'Content',
    items: [{ label: 'Blog', page: 'admin2-blog', icon: Newspaper }],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Support Tickets', page: 'admin2-support', icon: LifeBuoy, badge: 'tickets' },
      { label: 'Admin Management', page: 'admin2-admins', icon: UserCog },
      { label: 'Audit Log', page: 'admin2-audit', icon: History },
      { label: 'System Health', page: 'admin2-health', icon: Activity },
      { label: 'Settings', page: 'admin2-settings', icon: Settings },
      { label: 'Help & guide', page: 'admin2-help', icon: CircleHelp },
    ],
  },
];

export function Admin2Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { live } = useAdminOpsRealtimeStatus();
  const badgesQuery = useQuery({
    queryKey: queryKeys.dashboard.badges,
    queryFn: fetchDashboardBadges,
    refetchInterval: 60_000,
  });
  const unreadQuery = useQuery({
    queryKey: queryKeys.inAppNotifications.unreadCount,
    queryFn: fetchInAppUnreadCount,
    refetchInterval: live ? 60_000 : 20_000,
  });

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessPage(user, item.page)),
  })).filter((section) => section.items.length > 0);

  const go = (item: SidebarItem) => {
    navigate(item.href ?? getPagePath(item.page));
    onClose();
  };

  return (
    <aside
      className={`${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed inset-y-0 left-0 z-40 flex w-[236px] flex-shrink-0 flex-col gap-[18px] overflow-y-auto border-r border-[#e2e8e3] bg-[#fbfcfb] px-[16px] pb-[18px] pt-[22px] transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen`}
    >
      <div className="flex items-center justify-between">
        <img src={goquickLogo} alt="GoQuick" className="h-[51px] w-auto max-w-full object-contain object-left" />
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] p-1.5 text-[#7c857f] hover:bg-[#eef1ee] lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {sections.map((section) => (
        <nav key={section.title} className="flex w-full flex-col gap-[3px]" aria-label={`${section.title} navigation`}>
          <p className="flex h-[24px] items-start text-[10px] font-semibold uppercase tracking-[0.8px] text-[#7c857f]">
            {section.title}
          </p>
          {section.items.map((item) => {
            const path = getPagePath(item.page);
            const active =
              !item.href &&
              (location.pathname === path ||
                (path !== '/admin2' && location.pathname.startsWith(`${path}/`)) ||
                (item.activePrefix != null && location.pathname.startsWith(item.activePrefix)));
            const count =
              item.badge === 'inbox' ? unreadQuery.data ?? 0 : item.badge ? badgesQuery.data?.[item.badge] ?? 0 : 0;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => go(item)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[40px] w-full items-center gap-[11px] rounded-[8px] px-[12px] text-left text-[13px] transition-colors ${
                  active
                    ? 'bg-[#eaf6ed] font-semibold text-[#0d5e27]'
                    : 'font-medium text-[#45514a] hover:bg-[#f1f5f2] hover:text-[#17211b]'
                }`}
              >
                <Icon
                  className="size-[17px] flex-shrink-0"
                  strokeWidth={1.7}
                  color={active ? '#167D35' : '#7C857F'}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-[#fff5e5] px-[7px] py-[3px] text-[10px] font-bold leading-none text-[#b06d12]">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      ))}

      <div className="min-h-[8px] flex-1" />

      <div className="flex w-full flex-col gap-[8px] rounded-[12px] border border-[#e2e8e3] bg-[#f3faf5] p-[12px]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[#17211b]">Platform status</p>
          <span className={`size-[8px] rounded-full ${live ? 'bg-[#167d35]' : 'bg-[#b06d12]'}`} />
        </div>
        <p className="text-[11px] leading-[1.4] text-[#45514a]">
          {live
            ? 'Live updates are connected. Escrow, payouts and matching data are streaming in real time.'
            : 'Live updates are offline. Dashboard data refreshes automatically every minute.'}
        </p>
      </div>

    </aside>
  );
}
