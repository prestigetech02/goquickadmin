import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BadgeCheck,
  BarChart2,
  Bell,
  Bike,
  Building2,
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  MessageSquareWarning,
  PackageCheck,
  Settings,
  Ticket,
  Users,
  WalletCards,
  X,
  type LucideProps,
} from 'lucide-react';
import { fetchDashboardBadges } from '@/api/adminDashboardApi';
import { useAuth } from '@/context/AuthContext';
import { useAdminOpsRealtimeStatus } from '@/context/AdminOpsRealtimeContext';
import { canAccessPage, getPagePath, type PageKey } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { adminDisplayName, adminRoleLabel } from '@/lib/utils';
import type { DashboardBadges } from '@/types/api';
import goquickLogo from '@/assets/admin2/goquick-logo.png';
import { personInitials } from './format';

type SidebarItem = {
  label: string;
  page: PageKey;
  href?: string;
  /** Extra admin2 path whose sub-pages also highlight this item. */
  activePrefix?: string;
  icon: ComponentType<LucideProps>;
  badge?: keyof DashboardBadges;
};

const SECTIONS: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: 'Operations',
    items: [
      { label: 'Overview', page: 'admin2', icon: LayoutDashboard },
      { label: 'Users', page: 'admin2-users', icon: Users },
      { label: 'Runners', page: 'runners', activePrefix: '/admin2/runners/', icon: Bike },
      { label: 'Verifications', page: 'kyc', icon: BadgeCheck, badge: 'kyc' },
      { label: 'Errands', page: 'errands', icon: PackageCheck, badge: 'errands' },
      { label: 'Disputes', page: 'disputes', icon: MessageSquareWarning, badge: 'disputes' },
      { label: 'Withdrawals', page: 'payments', href: '/payments?tab=withdrawals', icon: WalletCards, badge: 'withdrawals' },
      { label: 'Transactions', page: 'payments', href: '/payments?tab=ledger', icon: ArrowLeftRight },
      { label: 'Service Zones', page: 'zones', icon: MapPin },
      { label: 'Notifications', page: 'notifications', icon: Bell },
    ],
  },
  {
    title: 'Financials',
    items: [
      { label: 'Revenue', page: 'company-revenue', icon: Building2 },
      { label: 'Finance', page: 'payments', icon: CreditCard },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', page: 'analytics', icon: BarChart2 },
      { label: 'Coupons', page: 'coupons', icon: Ticket },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Support Tickets', page: 'tickets', icon: LifeBuoy, badge: 'tickets' },
      { label: 'Help & Support', page: 'support', icon: LifeBuoy },
      { label: 'Settings', page: 'settings', icon: Settings },
    ],
  },
];

export function Admin2Sidebar({
  open,
  onClose,
  onRequestLogout,
}: {
  open: boolean;
  onClose: () => void;
  onRequestLogout: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { live } = useAdminOpsRealtimeStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const badgesQuery = useQuery({
    queryKey: queryKeys.dashboard.badges,
    queryFn: fetchDashboardBadges,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const displayName = adminDisplayName(user);
  const roleLabel = adminRoleLabel(user);
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
            const count = item.badge ? badgesQuery.data?.[item.badge] ?? 0 : 0;
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

      <div ref={menuRef} className="relative flex w-full items-center gap-[10px] border-t border-[#e2e8e3] px-[4px] pt-[12px]">
        <div className="flex size-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#1e2b23] text-[12px] font-semibold text-white">
          {personInitials(displayName)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p className="truncate text-[12px] font-semibold text-[#17211b]">{displayName}</p>
          <p className="truncate text-[10px] capitalize text-[#7c857f]">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          className="rounded-[6px] p-1 text-[#45514a] hover:bg-[#eef1ee]"
        >
          <Ellipsis className="size-[16px]" strokeWidth={1.8} />
        </button>
        {menuOpen ? (
          <div className="absolute bottom-full right-0 mb-2 w-[180px] overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-white py-1 shadow-[0px_8px_24px_0px_rgba(16,33,23,0.12)]">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate(getPagePath('dashboard'));
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#17211b] hover:bg-[#f8faf8]"
            >
              <LayoutDashboard className="size-[14px]" strokeWidth={1.8} />
              Classic dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRequestLogout();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#b84545] hover:bg-[#fff0f0]"
            >
              <LogOut className="size-[14px]" strokeWidth={1.8} />
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
