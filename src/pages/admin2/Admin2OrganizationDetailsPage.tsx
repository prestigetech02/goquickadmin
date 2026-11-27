import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Copy, MapPin, RefreshCw, Wallet } from 'lucide-react';
import {
  approveAdminOrganization,
  fetchAdminOrganization,
  reactivateAdminOrganization,
  setAdminOrganizationOwner,
  suspendAdminOrganization,
  updateAdminOrganization,
  type AdminOrganization,
  type AdminOrgFulfillmentMode,
} from '@/api/adminOrganizationsApi';
import { Chip } from '@/components/admin2/errand/parts';
import { OrganizationPartnerApiSection } from '@/components/admin2/organizations/OrganizationPartnerApiSection';
import { OrganizationPartnerWebhookSection } from '@/components/admin2/organizations/OrganizationPartnerWebhookSection';
import { OrganizationRateCardSection } from '@/components/admin2/organizations/OrganizationRateCardSection';
import { Skeleton } from '@/components/admin2/overview/primitives';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { MinimalToast } from '@/components/admin2/shared/MinimalToast';
import { PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import type { Notice } from '@/components/admin2/shared/TableControls';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import {
  getAdmin2ErrandHref,
  getAdmin2OrganizationId,
  getAdmin2UserHref,
  getPagePath,
} from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const OUTLINE_BUTTON =
  'flex h-[38px] items-center justify-center rounded-[24px] border border-[#1a7a0a] bg-white px-[18px] text-[12px] font-bold text-[#1a7a0a] transition-colors hover:bg-[#f3faf5] disabled:cursor-not-allowed disabled:opacity-50';

const STATUS_TONES: Record<string, { bg: string; color: string }> = {
  active: { bg: '#eaf6ed', color: '#0d5e27' },
  pending: { bg: '#fff6e5', color: '#9a6b10' },
  suspended: { bg: '#fdeded', color: '#b84545' },
};

function statusLabel(status: string) {
  if (status === 'active') return 'Active';
  if (status === 'pending') return 'Pending review';
  if (status === 'suspended') return 'Suspended';
  return status;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">{label}</span>
      <span className="text-[13px] text-[#17211b] break-words">{value}</span>
    </div>
  );
}

export function Admin2OrganizationDetailsPage() {
  const { pathname } = useLocation();
  const organizationId = getAdmin2OrganizationId(pathname) ?? 0;
  const queryClient = useQueryClient();
  const directoryPath = getPagePath('admin2-organizations');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  const detailQuery = useQuery({
    queryKey: queryKeys.organizations.detail(organizationId),
    queryFn: () => fetchAdminOrganization(organizationId),
    enabled: organizationId > 0,
    placeholderData: keepPreviousData,
  });

  const org = detailQuery.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(organizationId) });
  };

  const onNotice = (tone: 'ok' | 'error', text: string) => setNotice({ tone, text });

  const action = useMutation({
    mutationFn: async (kind: 'approve' | 'suspend' | 'reactivate' | 'owner') => {
      if (kind === 'approve') return approveAdminOrganization(organizationId);
      if (kind === 'suspend') return suspendAdminOrganization(organizationId, suspendReason);
      if (kind === 'reactivate') return reactivateAdminOrganization(organizationId);
      const phone = ownerPhone.trim();
      if (!/^\d{11}$/.test(phone)) throw new Error('Enter an 11-digit owner phone.');
      return setAdminOrganizationOwner(organizationId, { owner_phone: phone });
    },
    onSuccess: (_data, kind) => {
      invalidate();
      if (kind === 'approve') onNotice('ok', 'Business approved.');
      if (kind === 'suspend') {
        setSuspendReason('');
        onNotice('ok', 'Business suspended. New org errands are blocked.');
      }
      if (kind === 'reactivate') onNotice('ok', 'Business reactivated.');
      if (kind === 'owner') {
        setOwnerPhone('');
        onNotice('ok', 'Owner updated.');
      }
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'That action failed.')),
  });

  const fulfillmentMutation = useMutation({
    mutationFn: (mode: AdminOrgFulfillmentMode) =>
      updateAdminOrganization(organizationId, { fulfillment_mode: mode }),
    onSuccess: (updated) => {
      invalidate();
      onNotice(
        'ok',
        updated.fulfillment_mode === 'marketplace'
          ? 'New jobs from this business will appear on the open runner feed.'
          : 'New jobs from this business stay managed — assign from B2B Errands.',
      );
    },
    onError: (error) => onNotice('error', getApiErrorMessage(error, 'Could not update fulfillment mode.')),
  });

  if (detailQuery.isLoading || (!org && !detailQuery.isError)) {
    return (
      <div className="flex w-full flex-col gap-[20px]">
        <Skeleton className="h-[64px] w-[420px]" />
        <div className="grid grid-cols-2 gap-[12px] xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[110px] w-full rounded-[12px]" />
          ))}
        </div>
        <Skeleton className="h-[280px] w-full rounded-[12px]" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-[#f1d4d4] bg-[#fff0f0] p-[18px] text-[12px] text-[#b84545]">
        <span className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4" />
          {getApiErrorMessage(detailQuery.error, 'Could not load this business.')}
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            className="flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
          <Link to={directoryPath} className="flex items-center gap-1 font-semibold hover:underline">
            <ArrowLeft className="size-3.5" /> Back to organizations
          </Link>
        </div>
      </div>
    );
  }

  const busy = action.isPending || fulfillmentMutation.isPending;
  const fulfillmentMode: AdminOrgFulfillmentMode =
    org.fulfillment_mode === 'marketplace' ? 'marketplace' : 'managed';
  const ownerName =
    org.owner?.name?.trim() ||
    [org.owner?.first_name, org.owner?.last_name].filter(Boolean).join(' ').trim() ||
    '—';
  const locationLabel = [org.city, org.state].filter(Boolean).join(', ') || '—';
  const orgCode = org.code || `GQORG${String(org.id).padStart(5, '0')}`;
  const subtitle = [
    org.slug,
    locationLabel !== '—' ? locationLabel : null,
    org.partner_api_enabled ? 'Partner API on' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <p className="text-[10px] font-semibold uppercase text-[#167d35]">
            <Link to={directoryPath} className="hover:underline">
              Organizations
            </Link>
            <span className="px-[6px] text-[#a3c9ad]">/</span>
            {orgCode}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-[10px]">
            <h1 className="truncate text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">
              {org.name}
            </h1>
            <Chip
              tone={STATUS_TONES[org.status] ?? STATUS_TONES.pending}
              label={statusLabel(org.status)}
              dot
            />
            <Chip
              tone={
                fulfillmentMode === 'marketplace'
                  ? { bg: '#eaf2ff', color: '#1d4f91' }
                  : { bg: '#f1f4f2', color: '#45514a' }
              }
              label={fulfillmentMode === 'marketplace' ? 'Marketplace' : 'Managed'}
            />
          </div>
          <p className="text-[13px] text-[#6b6f66]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-[9px]">
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() => {
              void navigator.clipboard?.writeText(orgCode);
              onNotice('ok', `Copied ${orgCode}.`);
            }}
          >
            <Copy className="mr-[6px] size-[14px]" strokeWidth={2} />
            Copy ID
          </button>
          <Link to={directoryPath} className={OUTLINE_BUTTON}>
            Back to list
          </Link>
          {org.status === 'pending' ? (
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={busy}
              onClick={() => action.mutate('approve')}
            >
              Approve
            </button>
          ) : null}
          {org.status === 'suspended' ? (
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={busy}
              onClick={() => action.mutate('reactivate')}
            >
              Reactivate
            </button>
          ) : null}
          {org.status !== 'suspended' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => action.mutate('suspend')}
              className="flex h-[38px] items-center justify-center rounded-[24px] border border-[#e5a5a5] bg-[#fdeded] px-[18px] text-[12px] font-bold text-[#b84545] hover:bg-[#fbe4e4] disabled:opacity-50"
            >
              Suspend
            </button>
          ) : null}
        </div>
      </div>

      <MinimalToast notice={notice} onDismiss={() => setNotice(null)} />

      <MetricGrid columns={4}>
        <MetricCard
          label="Wallet"
          icon={Wallet}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={
            org.wallet
              ? `₦${Number(org.wallet.balance).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
              : '—'
          }
          context="Business float"
        />
        <MetricCard
          label="Branches"
          icon={MapPin}
          iconColor="#1d4f91"
          iconBg="#eaf2ff"
          value={String(org.locations_count ?? org.locations?.length ?? 0)}
          context="Active locations"
        />
        <MetricCard
          label="Errands"
          icon={Building2}
          iconColor="#9a6b10"
          iconBg="#fff6e5"
          value={String(org.errand_stats?.total ?? org.errands_count ?? 0)}
          context="All time"
        />
        <MetricCard
          label="Completed"
          icon={CheckCircle2}
          iconColor="#0d5e27"
          iconBg="#eaf6ed"
          value={String(org.errand_stats?.completed ?? 0)}
          context={`${org.errand_stats?.active ?? 0} active`}
        />
      </MetricGrid>

      <div className="flex w-full flex-col gap-[12px] xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          <section className="grid grid-cols-1 gap-[12px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px] sm:grid-cols-2">
            <p className="sm:col-span-2 text-[14px] font-semibold text-[#17211b]">Business profile</p>
            <Detail label="Organization ID" value={orgCode} />
            <Detail label="Status" value={statusLabel(org.status)} />
            <Detail label="Slug" value={org.slug} />
            <Detail label="Phone" value={org.contact_phone || '—'} />
            <Detail label="Email" value={org.contact_email || '—'} />
            <Detail label="CAC" value={org.cac_number || '—'} />
            <Detail label="City / State" value={locationLabel} />
            <div className="sm:col-span-2">
              <Detail label="Address" value={org.address || '—'} />
            </div>
            {org.notes?.trim() ? (
              <div className="sm:col-span-2">
                <Detail label="Internal notes" value={org.notes} />
              </div>
            ) : null}
          </section>

          <FulfillmentCard
            mode={fulfillmentMode}
            busy={busy}
            onChange={(mode) => fulfillmentMutation.mutate(mode)}
          />

          <OrganizationRateCardSection org={org} onNotice={onNotice} />
          <OrganizationPartnerWebhookSection org={org} onNotice={onNotice} />
          <RecentErrandsCard org={org} />
        </div>

        <div className="flex w-full flex-col gap-[12px] xl:w-[420px] xl:flex-shrink-0">
          <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px]">
            <p className="text-[14px] font-semibold text-[#17211b]">Owner</p>
            <div>
              <p className="text-[13px] font-semibold text-[#17211b]">{ownerName}</p>
              <p className="text-[12px] text-[#6b6f66]">
                {org.owner?.phone || 'No phone'}
                {org.owner?.email ? ` · ${org.owner.email}` : ''}
              </p>
            </div>
            {org.owner?.id ? (
              <Link
                to={getAdmin2UserHref(org.owner.id)}
                className="text-[12px] font-semibold text-[#167d35] hover:underline"
              >
                Open user profile
              </Link>
            ) : null}
            <div className="flex flex-col gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
              <label className="flex flex-col gap-[4px]">
                <span className="text-[11px] font-semibold text-[#7c857f]">Attach / change owner by phone</span>
                <input
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="08012345678"
                  className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
                />
              </label>
              <button
                type="button"
                disabled={busy || ownerPhone.length !== 11}
                onClick={() => action.mutate('owner')}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
              >
                Set owner
              </button>
            </div>
          </section>

          <KybCard kyb={org.kyb} />

          {org.status !== 'suspended' ? (
            <section className="flex flex-col gap-[8px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px]">
              <p className="text-[14px] font-semibold text-[#17211b]">Suspend</p>
              <p className="text-[12px] text-[#45514a]">
                Blocks new org errands. Optional reason is stored in internal notes.
              </p>
              <input
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason (optional)"
                className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => action.mutate('suspend')}
                className="h-[36px] rounded-[8px] border border-[#e5a5a5] bg-[#fdeded] px-[12px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fbe4e4] disabled:opacity-50"
              >
                Suspend business
              </button>
            </section>
          ) : null}

          <BranchesCard org={org} />
          <OrganizationPartnerApiSection org={org} onNotice={onNotice} />

          <section className="rounded-[12px] border border-[#e2e8e3] bg-white p-[16px] text-[12px] text-[#45514a]">
            <p className="text-[14px] font-semibold text-[#17211b]">Quick links</p>
            <ul className="mt-[10px] flex flex-col gap-[8px]">
              <li>
                <Link
                  to={`${getPagePath('admin2-b2b-errands')}?organization_id=${org.id}`}
                  className="font-semibold text-[#167d35] hover:underline"
                >
                  B2B errands for this business
                </Link>
              </li>
              <li>
                <Link to={getPagePath('admin2-zones')} className="font-semibold text-[#167d35] hover:underline">
                  Service zones (for rate card cities)
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function KybCard({
  kyb,
}: {
  kyb: AdminOrganization['kyb'];
}) {
  if (!kyb) {
    return (
      <section className="rounded-[12px] border border-[#e2e8e3] bg-white p-[16px] text-[12px] text-[#7c857f]">
        No KYB submission yet.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px]">
      <p className="text-[14px] font-semibold text-[#17211b]">KYB (QoreID)</p>
      <Detail label="KYB status" value={kyb.status || 'none'} />
      <Detail label="Address check" value={kyb.address_status || 'none'} />
      {kyb.failure_reason ? <Detail label="Failure" value={kyb.failure_reason} /> : null}
      <Detail label="ID type" value={kyb.director_id_type || '—'} />
      <Detail label="ID number" value={kyb.director_id_number || '—'} />
      <Detail label="LGA" value={kyb.lga || '—'} />
      <Detail label="Submitted" value={kyb.submitted_at || '—'} />
      <div className="flex flex-col gap-[6px] border-t border-[#e2e8e3] pt-[10px]">
        {kyb.director_id_url ? (
          <a
            href={kyb.director_id_url}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-semibold text-[#167d35] hover:underline"
          >
            Open director ID
          </a>
        ) : (
          <span className="text-[12px] text-[#7c857f]">Director ID file unavailable</span>
        )}
        {kyb.proof_of_address_url ? (
          <a
            href={kyb.proof_of_address_url}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-semibold text-[#167d35] hover:underline"
          >
            Open proof of address
          </a>
        ) : (
          <span className="text-[12px] text-[#7c857f]">Proof of address unavailable</span>
        )}
      </div>
      <p className="text-[10px] text-[#7c857f]">
        QoreID pass does not activate the business — use Approve when ops is satisfied.
      </p>
    </section>
  );
}

function FulfillmentCard({
  mode,
  busy,
  onChange,
}: {
  mode: AdminOrgFulfillmentMode;
  busy: boolean;
  onChange: (mode: AdminOrgFulfillmentMode) => void;
}) {
  return (
    <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px]">
      <p className="text-[14px] font-semibold text-[#17211b]">Fulfillment</p>
      <p className="text-[12px] text-[#45514a]">
        {mode === 'managed'
          ? 'Managed: new jobs stay off the open runner feed. Assign or invite from B2B Errands.'
          : 'Marketplace: new jobs broadcast to eligible runners like consumer errands.'}
      </p>
      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          disabled={busy || mode === 'managed'}
          onClick={() => onChange('managed')}
          className={`h-[34px] rounded-[8px] px-[12px] text-[12px] font-semibold ${
            mode === 'managed'
              ? 'bg-[#167d35] text-white'
              : 'border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50'
          }`}
        >
          Managed
        </button>
        <button
          type="button"
          disabled={busy || mode === 'marketplace'}
          onClick={() => onChange('marketplace')}
          className={`h-[34px] rounded-[8px] px-[12px] text-[12px] font-semibold ${
            mode === 'marketplace'
              ? 'bg-[#167d35] text-white'
              : 'border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50'
          }`}
        >
          Marketplace
        </button>
      </div>
      <p className="text-[10px] text-[#7c857f]">
        Changing mode applies to newly created jobs only. In-flight errands keep the mode they were created with.
      </p>
    </section>
  );
}

function BranchesCard({ org }: { org: AdminOrganization }) {
  return (
    <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px]">
      <p className="text-[14px] font-semibold text-[#17211b]">Branches</p>
      {(org.locations ?? []).length === 0 ? (
        <p className="text-[12px] text-[#7c857f]">No active branches.</p>
      ) : (
        <ul className="flex flex-col gap-[6px]">
          {(org.locations ?? []).map((loc) => (
            <li key={loc.id} className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[10px]">
              <p className="text-[13px] font-semibold text-[#17211b]">{loc.name}</p>
              <p className="text-[12px] text-[#6b6f66]">{loc.address}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentErrandsCard({ org }: { org: AdminOrganization }) {
  return (
    <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] bg-white p-[16px]">
      <p className="text-[14px] font-semibold text-[#17211b]">Recent errands</p>
      {(org.recent_errands ?? []).length === 0 ? (
        <p className="text-[12px] text-[#7c857f]">No errands tagged to this business yet.</p>
      ) : (
        <ul className="flex flex-col gap-[6px]">
          {(org.recent_errands ?? []).map((errand) => (
            <li
              key={errand.id}
              className="flex items-center justify-between gap-2 rounded-[10px] border border-[#e2e8e3] px-[12px] py-[10px]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#17211b]">{errand.title}</p>
                <p className="text-[11px] text-[#6b6f66]">{errand.status}</p>
              </div>
              <Link
                to={getAdmin2ErrandHref(errand.id)}
                className="shrink-0 text-[12px] font-semibold text-[#167d35] hover:underline"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
