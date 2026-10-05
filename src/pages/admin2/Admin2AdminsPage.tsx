import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, History, KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react';
import {
  fetchAdminAccounts,
  removeAdminAccess,
  resendAdminCredentials,
  revokeAdminSessions,
  type AdminAccessFilter,
  type AdminAccountItem,
} from '@/api/adminAdminsApi';
import { AdminConfirmModal, type ConfirmableAction } from '@/components/admin2/admins/AdminConfirmModal';
import { AdminDetailDrawer } from '@/components/admin2/admins/AdminDetailDrawer';
import { AdminDirectoryCard, type AdminRowAction } from '@/components/admin2/admins/AdminDirectoryCard';
import { adminName } from '@/components/admin2/admins/adminPresentation';
import { formatCount, formatPct } from '@/components/admin2/format';
import { pageForKey } from '@/components/admin2/shared/helpers';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { OUTLINE_BUTTON, PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { InviteAdminModal } from '@/components/admin2/users/InviteAdminModal';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const PER_PAGE = 25;
const DORMANT_DAYS = 30;

function isDormant(admin: AdminAccountItem, now: number): boolean {
  if (admin.is_super_admin) return false;
  const last = [admin.last_login?.at, admin.last_seen_at, admin.last_action_at]
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime());
  const reference = last.length ? Math.max(...last) : new Date(admin.created_at).getTime();
  return now - reference > DORMANT_DAYS * 86_400_000;
}

export function Admin2AdminsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [access, setAccess] = useState<AdminAccessFilter | 'all'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), 300);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ action: ConfirmableAction; admin: AdminAccountItem } | null>(null);

  const openParam = Number(searchParams.get('open'));
  const [selectedId, setSelectedId] = useState<number | null>(() => (Number.isInteger(openParam) && openParam > 0 ? openParam : null));

  const filterKey = `${access}:${debouncedSearch}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageForKey(pageState, filterKey);

  const params = {
    page,
    per_page: PER_PAGE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(access !== 'all' ? { access } : {}),
  };
  const listQuery = useQuery({
    queryKey: queryKeys.admins.list(params),
    queryFn: () => fetchAdminAccounts(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const admins = listQuery.data?.admins ?? [];
  const summary = listQuery.data?.summary;
  const meta = listQuery.data?.meta;
  const [now] = useState(() => Date.now());
  const dormant = admins.filter((a) => a.id !== user?.id && isDormant(a, now));

  const actionMutation = useMutation({
    mutationFn: async ({ action, admin, role }: { action: ConfirmableAction; admin: AdminAccountItem; role: 'buyer' | 'runner' }) => {
      if (action === 'resend') {
        const result = await resendAdminCredentials(admin.id);
        return result.email_sent
          ? `New sign-in details sent to ${admin.email}.`
          : `Password reset for ${adminName(admin)}, but the email could not be sent.`;
      }
      if (action === 'revoke') {
        const result = await revokeAdminSessions(admin.id);
        return `${adminName(admin)} was signed out of ${result.revoked === 1 ? '1 session' : `${result.revoked} sessions`}.`;
      }
      await removeAdminAccess(admin.id, role);
      return `${adminName(admin)} no longer has admin access.`;
    },
    onSuccess: (message, { action }) => {
      setConfirm(null);
      setNotice({ tone: 'ok', text: message });
      if (action === 'remove') setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
    },
  });

  const onAction = (action: AdminRowAction, admin: AdminAccountItem) => {
    if (action === 'view') {
      setSelectedId(admin.id);
      return;
    }
    actionMutation.reset();
    setConfirm({ action, admin });
  };

  const closeDrawer = () => {
    setSelectedId(null);
    if (searchParams.has('open')) {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  };

  const activePct = summary && summary.total > 0 ? (summary.active_7d / summary.total) * 100 : null;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Access control · Live"
        title="Admin Management"
        subtitle="Invite staff, scope what they can reach, and keep an eye on how admin access is being used."
        actions={
          <>
            {canAccessPage(user, 'admin2-audit') ? (
              <button type="button" onClick={() => navigate(getPagePath('admin2-audit'))} className={OUTLINE_BUTTON}>
                <History className="size-[15px]" strokeWidth={1.8} />
                Audit log
              </button>
            ) : null}
            <button type="button" onClick={() => setInviteOpen(true)} className={PRIMARY_BUTTON}>
              <UserPlus className="size-[15px]" strokeWidth={1.8} />
              Invite admin
            </button>
          </>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <MetricGrid columns={4}>
        <MetricCard
          label="Admins"
          icon={Users}
          iconColor="#2563a8"
          iconBg="#e8f1fb"
          value={summary ? formatCount(summary.total) : undefined}
          context={summary ? `${summary.super_admins} super · ${summary.total - summary.super_admins} module-scoped` : undefined}
        />
        <MetricCard
          label="Active this week"
          icon={Activity}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={summary ? formatCount(summary.active_7d) : undefined}
          pill={activePct != null ? { label: formatPct(activePct, 0), tone: activePct >= 50 ? 'green' : 'amber' } : null}
          context="Signed in, used a session or made a change"
        />
        <MetricCard
          label="Super admins"
          icon={ShieldCheck}
          iconColor="#6b46c1"
          iconBg="#f1ecfb"
          value={summary ? formatCount(summary.super_admins) : undefined}
          pill={summary && summary.super_admins > 3 ? { label: 'Review', tone: 'amber' } : null}
          context="Full access, including this page"
        />
        <MetricCard
          label="Pending setup"
          icon={KeyRound}
          iconColor="#b06d12"
          iconBg="#fff5e5"
          value={summary ? formatCount(summary.pending_password) : undefined}
          context="Still on a temporary password"
        />
      </MetricGrid>

      {dormant.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] rounded-[10px] border border-[#f3e1c2] bg-[#fffaf1] px-[14px] py-[10px]">
          <p className="text-[11px] font-semibold text-[#8a5410]">Access review</p>
          <p className="min-w-0 flex-1 text-[11px] text-[#8a5410]">
            {dormant.length === 1 ? '1 admin hasn’t' : `${dormant.length} admins haven’t`} been active in {DORMANT_DAYS} days. Remove access you no longer need.
          </p>
          <div className="flex flex-wrap gap-[6px]">
            {dormant.slice(0, 4).map((admin) => (
              <button
                key={admin.id}
                type="button"
                onClick={() => setSelectedId(admin.id)}
                className="rounded-full border border-[#f3e1c2] bg-white px-[9px] py-[3px] text-[10px] font-semibold text-[#8a5410] hover:bg-[#fff3df]"
              >
                {adminName(admin)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AdminDirectoryCard
        admins={admins}
        summary={summary}
        loading={listQuery.isLoading}
        error={listQuery.isError ? getApiErrorMessage(listQuery.error, 'Could not load admins.') : null}
        dimmed={listQuery.isPlaceholderData}
        access={access}
        onAccessChange={setAccess}
        search={search}
        onSearchChange={setSearch}
        page={page}
        lastPage={meta?.last_page ?? 1}
        total={meta?.total ?? 0}
        onPageChange={(next) => setPageState({ key: filterKey, page: next })}
        currentAdminId={user?.id}
        onAction={onAction}
      />

      {selectedId != null ? (
        <AdminDetailDrawer
          adminId={selectedId}
          initial={admins.find((a) => a.id === selectedId)}
          onClose={closeDrawer}
          onAction={onAction}
          busy={actionMutation.isPending}
        />
      ) : null}

      {confirm ? (
        <AdminConfirmModal
          action={confirm.action}
          admin={confirm.admin}
          pending={actionMutation.isPending}
          error={actionMutation.isError ? getApiErrorMessage(actionMutation.error, 'That action failed.') : null}
          onCancel={() => setConfirm(null)}
          onConfirm={(role) => actionMutation.mutate({ action: confirm.action, admin: confirm.admin, role })}
        />
      ) : null}

      <InviteAdminModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
