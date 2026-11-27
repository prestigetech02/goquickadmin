import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import {
  createAdminOrganization,
  fetchAdminOrganizations,
  type AdminOrganization,
  type CreateAdminOrganizationPayload,
} from '@/api/adminOrganizationsApi';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { MinimalToast } from '@/components/admin2/shared/MinimalToast';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { SearchField, type Notice } from '@/components/admin2/shared/TableControls';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2OrganizationHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { useDebounced } from '@/components/admin2/shared/useDebounced';

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended';

const FILTER_SELECT =
  'h-[36px] rounded-[8px] border border-[#e2e8e3] bg-white px-[10px] text-[11px] font-semibold text-[#17211b] outline-none focus:border-[#167d35]';

const EMPTY_FORM: CreateAdminOrganizationPayload = {
  name: '',
  owner_phone: '',
  status: 'active',
  contact_phone: '',
  contact_email: '',
  cac_number: '',
  address: '',
  city: '',
  state: '',
  notes: '',
};

function statusBadge(status: string) {
  if (status === 'active') {
    return 'bg-[#eaf6ed] text-[#0d5e27]';
  }
  if (status === 'pending') {
    return 'bg-[#fff6e5] text-[#9a6b10]';
  }
  if (status === 'suspended') {
    return 'bg-[#fdeded] text-[#b84545]';
  }
  return 'bg-[#f1f4f2] text-[#7c857f]';
}

export function Admin2OrganizationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateAdminOrganizationPayload>(EMPTY_FORM);

  const listParams = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      per_page: 100,
    }),
    [debouncedSearch, status],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.organizations.list(listParams),
    queryFn: () => fetchAdminOrganizations(listParams),
  });

  const orgs = listQuery.data?.organizations ?? [];
  const summary = listQuery.data?.summary;
  const loading = listQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminOrganization({
        name: form.name.trim(),
        owner_phone: form.owner_phone?.trim() || undefined,
        status: form.status === 'pending' ? 'pending' : 'active',
        contact_phone: form.contact_phone?.trim() || undefined,
        contact_email: form.contact_email?.trim() || undefined,
        cac_number: form.cac_number?.trim() || undefined,
        address: form.address?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      }),
    onSuccess: (org) => {
      setCreating(false);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      setNotice({ tone: 'ok', text: `“${org.name}” created and owner attached.` });
      navigate(getAdmin2OrganizationHref(org.id));
    },
    onError: (error) =>
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not create business.') }),
  });

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Operations · Business"
        title="Organizations Mgt"
        actionsBesideTitle
        subtitle="Approve pending businesses, suspend bad actors, attach owners, and inspect org-tagged errands."
        actions={
          <button type="button" onClick={() => setCreating(true)} className={PRIMARY_BUTTON}>
            <Plus className="size-[15px]" strokeWidth={2} />
            Add business
          </button>
        }
      />

      <MinimalToast notice={notice} onDismiss={() => setNotice(null)} />

      {listQuery.isError ? (
        <p className="rounded-[10px] border border-[#e5a5a5] bg-[#fdeded] px-3 py-2 text-[12px] text-[#b84545]">
          {getApiErrorMessage(listQuery.error, 'Could not load organizations.')}
        </p>
      ) : null}

      <MetricGrid columns={4}>
        <MetricCard
          label="Businesses"
          icon={Building2}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={loading ? '…' : String(summary?.total ?? orgs.length)}
          context="All registered orgs"
        />
        <MetricCard
          label="Pending"
          icon={Building2}
          iconColor="#9a6b10"
          iconBg="#fff6e5"
          value={loading ? '…' : String(summary?.pending ?? 0)}
          context="Awaiting approval"
        />
        <MetricCard
          label="Active"
          icon={Building2}
          iconColor="#0d5e27"
          iconBg="#eaf6ed"
          value={loading ? '…' : String(summary?.active ?? 0)}
          context="Can post org errands"
        />
        <MetricCard
          label="Suspended"
          icon={Building2}
          iconColor="#b84545"
          iconBg="#fdeded"
          value={loading ? '…' : String(summary?.suspended ?? 0)}
          context="New org jobs blocked"
        />
      </MetricGrid>

      <div className="flex flex-col gap-[12px] rounded-[14px] border border-[#e2e8e3] bg-white p-[14px] font-inter">
        <div className="flex flex-wrap items-center gap-[10px]">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search name, GQORG…, phone, CAC, city, or owner"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={FILTER_SELECT}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e2e8e3] text-[10px] font-semibold uppercase tracking-[0.4px] text-[#7c857f]">
                <th className="px-2 py-2">Business</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Branches</th>
                <th className="px-2 py-2">Errands</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-[12px] text-[#7c857f]">
                    Loading…
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-[12px] text-[#7c857f]">
                    No businesses match these filters.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => <OrgRow key={org.id} org={org} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating ? (
        <Modal
          open
          title="Add business"
          onClose={() => {
            if (!createMutation.isPending) setCreating(false);
          }}
        >
          <form
            className="flex flex-col gap-[12px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                setNotice({ tone: 'error', text: 'Business name is required.' });
                return;
              }
              if (!form.owner_phone || form.owner_phone.replace(/\D/g, '').length !== 11) {
                setNotice({ tone: 'error', text: 'Owner phone must be 11 digits.' });
                return;
              }
              createMutation.mutate();
            }}
          >
            <Field
              label="Business name"
              value={form.name ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              required
            />
            <Field
              label="Owner phone"
              value={form.owner_phone ?? ''}
              onChange={(v) =>
                setForm((f) => ({ ...f, owner_phone: v.replace(/\D/g, '').slice(0, 11) }))
              }
              placeholder="08012345678"
              required
            />
            <label className="flex flex-col gap-[4px]">
              <span className="text-[11px] font-semibold text-[#7c857f]">Initial status</span>
              <select
                value={form.status ?? 'active'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'pending' | 'active' }))
                }
                className={FILTER_SELECT}
              >
                <option value="active">Active (can post immediately)</option>
                <option value="pending">Pending review</option>
              </select>
            </label>
            <Field
              label="Contact phone"
              value={form.contact_phone ?? ''}
              onChange={(v) =>
                setForm((f) => ({ ...f, contact_phone: v.replace(/\D/g, '').slice(0, 11) }))
              }
            />
            <Field
              label="Contact email"
              value={form.contact_email ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, contact_email: v }))}
            />
            <Field
              label="CAC number"
              value={form.cac_number ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, cac_number: v }))}
            />
            <Field
              label="Address"
              value={form.address ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
            />
            <div className="grid grid-cols-2 gap-[10px]">
              <Field
                label="City"
                value={form.city ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
              />
              <Field
                label="State"
                value={form.state ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, state: v }))}
              />
            </div>
            <Field
              label="Internal notes"
              value={form.notes ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => setCreating(false)}
                className="h-[38px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold"
              >
                Cancel
              </button>
              <button type="submit" disabled={createMutation.isPending} className={PRIMARY_BUTTON}>
                {createMutation.isPending ? 'Saving…' : 'Create business'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function OrgRow({ org }: { org: AdminOrganization }) {
  const href = getAdmin2OrganizationHref(org.id);
  const owner =
    org.owner?.name?.trim() ||
    [org.owner?.first_name, org.owner?.last_name].filter(Boolean).join(' ').trim() ||
    org.owner?.phone ||
    '—';

  return (
    <tr className="border-b border-[#eef2ef] text-[12px] text-[#17211b] hover:bg-[#f8faf8]">
      <td className="px-2 py-3">
        <Link to={href} className="text-left">
          <span className="font-semibold hover:text-[#167d35]">{org.name}</span>
          <span className="mt-0.5 block text-[11px] text-[#6b6f66]">
            {org.code || `GQORG${String(org.id).padStart(5, '0')}`}
            {' · '}
            {[org.city, org.state].filter(Boolean).join(', ') || org.slug}
          </span>
        </Link>
      </td>
      <td className="px-2 py-3">
        <span className="block font-medium">{owner}</span>
        {org.owner?.phone ? (
          <span className="block text-[11px] text-[#6b6f66]">{org.owner.phone}</span>
        ) : null}
      </td>
      <td className="px-2 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(org.status)}`}>
          {org.status}
        </span>
      </td>
      <td className="px-2 py-3">{org.locations_count}</td>
      <td className="px-2 py-3">{org.errands_count}</td>
      <td className="px-2 py-3 text-right">
        <Link to={href} className="text-[12px] font-semibold text-[#167d35] hover:underline">
          View
        </Link>
      </td>
    </tr>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-[4px]">
      <span className="text-[11px] font-semibold text-[#7c857f]">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-[36px] rounded-[8px] border border-[#e2e8e3] px-[10px] text-[12px] outline-none focus:border-[#167d35]"
      />
    </label>
  );
}
