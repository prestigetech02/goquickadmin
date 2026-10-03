import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bike, Gift, LayoutGrid, MapPinned, Percent, Plug, Route, ShieldCheck, Wallet } from 'lucide-react';
import { fetchAdminSettingsBoard } from '@/api/adminSettingsBoardApi';
import { CategoriesCard } from '@/components/admin2/settings/CategoriesCard';
import { FareRulesCard } from '@/components/admin2/settings/FareRulesCard';
import { FeesCard } from '@/components/admin2/settings/FeesCard';
import { IntegrationsCard } from '@/components/admin2/settings/IntegrationsCard';
import { OperationsCard } from '@/components/admin2/settings/OperationsCard';
import { PayoutsCard } from '@/components/admin2/settings/PayoutsCard';
import { lastChangeText, latestChange, type SettingsSectionId } from '@/components/admin2/settings/presentation';
import { ReferralCard } from '@/components/admin2/settings/ReferralCard';
import { SectionNav, type NavItem } from '@/components/admin2/settings/SectionNav';
import { SecurityCard } from '@/components/admin2/settings/SecurityCard';
import { ZonesCard } from '@/components/admin2/settings/ZonesCard';
import { PageHeader } from '@/components/admin2/shared/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

export function Admin2SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const boardQuery = useQuery({ queryKey: queryKeys.settings.board, queryFn: fetchAdminSettingsBoard });
  const board = boardQuery.data;

  const finance = Boolean(user?.permissions?.can_manage_finance);
  const operations = Boolean(user?.permissions?.can_manage_operations);
  const superAdmin = Boolean(user?.permissions?.is_super_admin);

  const items = useMemo<NavItem[]>(() => {
    const list: Array<NavItem | false> = [
      finance && { id: 'pricing', label: 'Fees & commission', icon: Percent },
      finance && { id: 'fare-rules', label: 'Fare rules', icon: Route },
      finance && { id: 'referrals', label: 'Referral program', icon: Gift },
      operations && { id: 'operations', label: 'Runner operations', icon: Bike },
      finance && { id: 'payouts', label: 'Payments & payouts', icon: Wallet },
      { id: 'categories', label: 'Service categories', icon: LayoutGrid },
      finance && { id: 'zones', label: 'Service zones', icon: MapPinned },
      superAdmin && { id: 'security', label: 'Security & access', icon: ShieldCheck },
      { id: 'integrations', label: 'Integrations', icon: Plug },
    ];
    return list.filter((item): item is NavItem => Boolean(item));
  }, [finance, operations, superAdmin]);

  const status = useMemo(() => {
    if (!board) return null;
    const missing = board.integrations.filter((i) => !i.configured).length;
    return {
      healthy: missing === 0,
      title: missing === 0 ? 'Configuration healthy' : `${missing} ${missing === 1 ? 'service needs' : 'services need'} setup`,
      text: lastChangeText(latestChange([board.operations?.last_change, board.payouts?.last_change])),
    };
  }, [board]);

  useEffect(() => {
    if (!location.hash.startsWith('#settings-')) return;
    const id = window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => window.clearTimeout(id);
  }, [location.hash]);

  const go = (page: Parameters<typeof getPagePath>[0]) => (canAccessPage(user, page) ? () => navigate(getPagePath(page)) : undefined);
  const scrollToSection = (id: SettingsSectionId) => document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Administration · Settings"
        title="Settings"
        subtitle="Commission, fare rules, referral rewards, runner operations, payouts and admin access in one place. Each section saves on its own."
      />

      {boardQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(boardQuery.error, 'Could not load settings.')}
        </p>
      ) : null}

      <div className="grid w-full grid-cols-1 items-start gap-[16px] lg:grid-cols-[210px_minmax(0,1fr)]">
        <SectionNav items={items} status={status} />

        <div className="flex min-w-0 flex-col gap-[16px]">
          {finance ? (
            <>
              <FeesCard onOpenFareRules={() => scrollToSection('fare-rules')} />
              <FareRulesCard />
              <ReferralCard />
            </>
          ) : null}

          {operations || finance ? (
            <div className="flex w-full flex-col gap-[16px] xl:flex-row">
              {operations ? <OperationsCard section={board?.operations} /> : null}
              {finance ? <PayoutsCard section={board?.payouts} /> : null}
            </div>
          ) : null}

          <CategoriesCard canEdit={operations} onOpenAnalytics={go('admin2-analytics')} />

          {finance ? <ZonesCard onManage={go('admin2-zones')} /> : null}

          <div className="flex w-full flex-col gap-[16px] xl:flex-row">
            {superAdmin ? <SecurityCard onManage={go('admin2-admins')} /> : null}
            <IntegrationsCard board={board} />
          </div>

          <div className="flex items-center gap-[10px] rounded-[12px] border border-[#d4e9da] bg-[#f3faf5] px-[16px] py-[12px]">
            <ShieldCheck className="size-[16px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
            <p className="text-[11px] text-[#45514a]">Changes are recorded with your name and time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
