import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
import { OrganizationPartnerApiSection } from '@/components/admin2/organizations/OrganizationPartnerApiSection';
import { OrganizationPartnerWebhookSection } from '@/components/admin2/organizations/OrganizationPartnerWebhookSection';
import { PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { useState } from 'react';

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

export function OrganizationViewDrawer({
  organizationId,
  onClose,
  onNotice,
}: {
  organizationId: number;
  onClose: () => void;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
}) {
  const queryClient = useQueryClient();
  const [ownerPhone, setOwnerPhone] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  const detailQuery = useQuery({
    queryKey: queryKeys.organizations.detail(organizationId),
    queryFn: () => fetchAdminOrganization(organizationId),
  });

  const org = detailQuery.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(organizationId) });
  };

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

  return (
    <Drawer
      open
      onClose={onClose}
      width="2xl"
      title={org?.name ?? 'Business'}
      subtitle={org ? statusLabel(org.status) : 'Loading…'}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            Close
          </button>
          {org?.status === 'pending' ? (
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={action.isPending}
              onClick={() => action.mutate('approve')}
            >
              Approve
            </button>
          ) : null}
          {org?.status === 'suspended' ? (
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={action.isPending}
              onClick={() => action.mutate('reactivate')}
            >
              Reactivate
            </button>
          ) : null}
          {org && org.status !== 'suspended' ? (
            <button
              type="button"
              disabled={action.isPending}
              onClick={() => action.mutate('suspend')}
              className="h-[38px] rounded-[8px] border border-[#e5a5a5] bg-[#fdeded] px-[14px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fbe4e4]"
            >
              Suspend
            </button>
          ) : null}
        </div>
      }
    >
      {detailQuery.isLoading ? (
        <p className="text-[13px] text-[#7c857f]">Loading business…</p>
      ) : detailQuery.isError ? (
        <p className="rounded-[10px] border border-[#e5a5a5] bg-[#fdeded] px-3 py-2 text-[12px] text-[#b84545]">
          {getApiErrorMessage(detailQuery.error, 'Could not load business.')}
        </p>
      ) : org ? (
        <OrgBody
          org={org}
          ownerPhone={ownerPhone}
          setOwnerPhone={setOwnerPhone}
          suspendReason={suspendReason}
          setSuspendReason={setSuspendReason}
          onSetOwner={() => action.mutate('owner')}
          onFulfillmentChange={(mode) => fulfillmentMutation.mutate(mode)}
          onNotice={onNotice}
          busy={action.isPending || fulfillmentMutation.isPending}
        />
      ) : null}
    </Drawer>
  );
}

function OrgBody({
  org,
  ownerPhone,
  setOwnerPhone,
  suspendReason,
  setSuspendReason,
  onSetOwner,
  onFulfillmentChange,
  onNotice,
  busy,
}: {
  org: AdminOrganization;
  ownerPhone: string;
  setOwnerPhone: (v: string) => void;
  suspendReason: string;
  setSuspendReason: (v: string) => void;
  onSetOwner: () => void;
  onFulfillmentChange: (mode: AdminOrgFulfillmentMode) => void;
  onNotice: (tone: 'ok' | 'error', text: string) => void;
  busy: boolean;
}) {
  const ownerName =
    org.owner?.name?.trim() ||
    [org.owner?.first_name, org.owner?.last_name].filter(Boolean).join(' ').trim() ||
    '—';
  const fulfillmentMode: AdminOrgFulfillmentMode =
    org.fulfillment_mode === 'marketplace' ? 'marketplace' : 'managed';

  return (
    <div className="flex flex-col gap-[18px] font-inter">
      <section className="grid grid-cols-1 gap-[12px] rounded-[12px] border border-[#e2e8e3] bg-[#f8faf8] p-[14px] sm:grid-cols-2">
        <Detail label="Status" value={statusLabel(org.status)} />
        <Detail label="Slug" value={org.slug} />
        <Detail label="Phone" value={org.contact_phone || '—'} />
        <Detail label="Email" value={org.contact_email || '—'} />
        <Detail label="CAC" value={org.cac_number || '—'} />
        <Detail label="City / State" value={[org.city, org.state].filter(Boolean).join(', ') || '—'} />
        <div className="sm:col-span-2">
          <Detail label="Address" value={org.address || '—'} />
        </div>
        {org.notes?.trim() ? (
          <div className="sm:col-span-2">
            <Detail label="Internal notes" value={org.notes} />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] p-[14px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Fulfillment</p>
        <p className="text-[12px] text-[#45514a]">
          {fulfillmentMode === 'managed'
            ? 'Managed: new jobs stay off the open runner feed. Assign or invite from B2B Errands.'
            : 'Marketplace: new jobs broadcast to eligible runners like consumer errands.'}
        </p>
        <div className="flex flex-wrap gap-[8px]">
          <button
            type="button"
            disabled={busy || fulfillmentMode === 'managed'}
            onClick={() => onFulfillmentChange('managed')}
            className={`h-[34px] rounded-[8px] px-[12px] text-[12px] font-semibold ${
              fulfillmentMode === 'managed'
                ? 'bg-[#167d35] text-white'
                : 'border border-[#d4ddd6] bg-white text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50'
            }`}
          >
            Managed
          </button>
          <button
            type="button"
            disabled={busy || fulfillmentMode === 'marketplace'}
            onClick={() => onFulfillmentChange('marketplace')}
            className={`h-[34px] rounded-[8px] px-[12px] text-[12px] font-semibold ${
              fulfillmentMode === 'marketplace'
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

      <OrganizationPartnerApiSection org={org} onNotice={onNotice} />
      <OrganizationPartnerWebhookSection org={org} onNotice={onNotice} />

      <section className="flex flex-col gap-[10px] rounded-[12px] border border-[#e2e8e3] p-[14px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Owner</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
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
              Open user
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
          <label className="flex min-w-[180px] flex-1 flex-col gap-[4px]">
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
            onClick={onSetOwner}
            className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
          >
            Set owner
          </button>
        </div>
      </section>

      {org.status !== 'suspended' ? (
        <label className="flex flex-col gap-[4px]">
          <span className="text-[11px] font-semibold text-[#7c857f]">Suspend reason (optional)</span>
          <input
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Shown in internal notes"
            className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
          />
        </label>
      ) : null}

      <section className="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        <Stat
          label="Wallet"
          value={
            org.wallet
              ? `₦${Number(org.wallet.balance).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
              : '—'
          }
        />
        <Stat label="Branches" value={String(org.locations_count ?? org.locations?.length ?? 0)} />
        <Stat label="Errands" value={String(org.errand_stats?.total ?? org.errands_count ?? 0)} />
        <Stat label="Completed" value={String(org.errand_stats?.completed ?? 0)} />
      </section>

      <section className="flex flex-col gap-[8px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Branches</p>
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

      <section className="flex flex-col gap-[8px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">Recent errands</p>
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[#e2e8e3] bg-white px-[12px] py-[10px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-[#17211b]">{value}</p>
    </div>
  );
}
