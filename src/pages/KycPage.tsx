import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import {
  approveRunnerVerification,
  fetchRunnerVerification,
  fetchRunnerVerificationMetrics,
  fetchRunnerVerifications,
  rejectRunnerVerification,
} from '@/api/adminRunnersApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime, formatNumber, titleCase } from '@/lib/utils';
import type { RunnerVerificationItem } from '@/types/api';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const PAGE_SIZE = 25;

function fullName(user: RunnerVerificationItem['user']) {
  if (!user) return 'Unknown runner';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || 'Unknown runner';
}

function docLabel(type: string | null | undefined) {
  if (!type) return '—';
  return type
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => titleCase(part))
    .join(' ');
}

function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

async function refreshKycQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  verificationId?: number | null,
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.runners.all });
  if (verificationId) {
    await queryClient.refetchQueries({
      queryKey: queryKeys.runners.verificationDetail(verificationId),
    });
  }
}

export function KycPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: PAGE_SIZE, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filter !== 'all') params.status = filter;
    return params;
  }, [debouncedSearch, filter, page]);

  const listQuery = useQuery({
    queryKey: queryKeys.runners.verifications(listParams),
    queryFn: () => fetchRunnerVerifications(listParams),
  });

  const metricsQuery = useQuery({
    queryKey: queryKeys.runners.verificationMetrics,
    queryFn: fetchRunnerVerificationMetrics,
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.runners.verificationDetail(selectedId ?? 0),
    queryFn: () => fetchRunnerVerification(selectedId!),
    enabled: selectedId !== null,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveRunnerVerification(id),
    onSuccess: async (_data, id) => {
      setActionError(null);
      setActionSuccess('Runner KYC approved. The runner can now go online and accept errands.');
      await refreshKycQueries(queryClient, id);
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Approve failed.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectRunnerVerification(id, reason),
    onSuccess: async (_data, { id }) => {
      setActionError(null);
      setRejectReason('');
      setActionSuccess('Runner KYC rejected. The runner will be notified to resubmit.');
      await refreshKycQueries(queryClient, id);
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Reject failed.'));
    },
  });

  const items = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const selected = detailQuery.data;
  const metrics = metricsQuery.data;

  const columns: Column<RunnerVerificationItem>[] = [
    {
      key: 'runner',
      header: 'Runner',
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <PersonAvatar name={fullName(row.user)} src={row.selfie_photo} />
          <div className="min-w-0">
            <p className="font-semibold text-ink-900 truncate">{fullName(row.user)}</p>
            <p className="text-xs text-ink-400 truncate">{row.user?.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-ink-600">{row.user?.phone || '—'}</span>,
    },
    {
      key: 'document',
      header: 'Document',
      render: (row) => (
        <div>
          <p className="text-ink-800">{docLabel(row.id_document_type)}</p>
          <p className="text-xs text-ink-400">ID: {row.id_number || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      render: (row) => (
        <span className="text-ink-600">{row.runner_profile?.primary_errand_area || '—'}</span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (row) => (
        <span className="text-ink-500 text-xs">
          {formatDateTime(row.submitted_at || row.created_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
  ];

  function openReview(id: number) {
    setActionError(null);
    setActionSuccess(null);
    setRejectReason('');
    setSelectedId(id);
  }

  function closeReview() {
    setSelectedId(null);
    setActionError(null);
    setActionSuccess(null);
    setRejectReason('');
  }

  return (
    <div>
      <PageHeader
        title="Runner KYC"
        subtitle="Review runner identity verification submissions"
        action={
          <button
            type="button"
            onClick={() => {
              void listQuery.refetch();
              void metricsQuery.refetch();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${listQuery.isFetching || metricsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {actionSuccess && selectedId === null ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {actionSuccess}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Approved"
          value={formatNumber(metrics?.approved ?? 0)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Pending"
          value={formatNumber(metrics?.pending ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Rejected"
          value={formatNumber(metrics?.rejected ?? 0)}
          icon={<XCircle className="w-5 h-5" />}
          accent="error"
        />
      </div>

      {listQuery.isError ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load KYC queue</p>
            <p className="mt-1">{getApiErrorMessage(listQuery.error, 'API request failed.')}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or phone…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === opt
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
              }`}
            >
              {titleCase(opt)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={items}
          loading={listQuery.isLoading}
          onRowClick={(row) => openReview(row.id)}
          emptyMessage="No KYC submissions found"
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      <Modal open={selectedId !== null} onClose={closeReview} title="KYC Review" size="xl">
        {detailQuery.isLoading ? (
          <p className="text-sm text-ink-400">Loading verification…</p>
        ) : detailQuery.isError || !selected ? (
          <p className="text-sm text-error-600">
            {getApiErrorMessage(detailQuery.error, 'Could not load verification.')}
          </p>
        ) : (
          <KycReviewBody
            item={selected}
            actionError={actionError}
            actionSuccess={actionSuccess}
            rejectReason={rejectReason}
            onRejectReasonChange={setRejectReason}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
            onApprove={() => {
              if (!window.confirm(`Approve KYC for ${fullName(selected.user)}?`)) return;
              approveMutation.mutate(selected.id);
            }}
            onReject={() => {
              if (!window.confirm(`Reject KYC for ${fullName(selected.user)}?`)) return;
              rejectMutation.mutate({ id: selected.id, reason: rejectReason.trim() });
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function KycReviewBody({
  item,
  actionError,
  actionSuccess,
  rejectReason,
  onRejectReasonChange,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
}: {
  item: RunnerVerificationItem;
  actionError: string | null;
  actionSuccess: string | null;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const profile = item.runner_profile;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <PersonAvatar name={fullName(item.user)} src={item.selfie_photo} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-ink-900">{fullName(item.user)}</h3>
          <p className="text-sm text-ink-500">{displayValue(item.user?.email)}</p>
          <p className="text-sm text-ink-500">{displayValue(item.user?.phone)}</p>
          <p className="text-xs text-ink-400 mt-1">
            Submitted {formatDateTime(item.submitted_at || item.created_at)}
            {item.reviewed_at ? ` · Reviewed ${formatDateTime(item.reviewed_at)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge status={item.status} />
          {profile?.verification_status ? (
            <Badge status={profile.verification_status} label={`Profile: ${profile.verification_status}`} />
          ) : null}
        </div>
      </div>

      <ReviewSection title="Identity">
        <InfoGrid
          items={[
            ['Document type', docLabel(item.id_document_type)],
            ['Document number', displayValue(item.id_number)],
            ['Date of birth', displayValue(item.date_of_birth)],
            ['Gender', displayValue(item.gender)],
            ['BVN', displayValue(item.bvn)],
            ['Previous workplace', displayValue(item.previous_workplace)],
          ]}
        />
      </ReviewSection>

      <ReviewSection title="Next of kin">
        <InfoGrid
          items={[
            ['Name', displayValue(item.next_of_kin_name)],
            ['Phone', displayValue(item.next_of_kin_phone)],
            ['Address', displayValue(item.next_of_kin_address)],
          ]}
        />
      </ReviewSection>

      <ReviewSection title="Guarantor 1">
        <InfoGrid
          items={[
            ['Name', displayValue(item.guarantor1_name)],
            ['Phone', displayValue(item.guarantor1_phone)],
            ['Address', displayValue(item.guarantor1_address)],
          ]}
        />
      </ReviewSection>

      <ReviewSection title="Guarantor 2">
        <InfoGrid
          items={[
            ['Name', displayValue(item.guarantor2_name)],
            ['Phone', displayValue(item.guarantor2_phone)],
            ['Address', displayValue(item.guarantor2_address)],
          ]}
        />
      </ReviewSection>

      <ReviewSection title="Mobility & service area">
        <InfoGrid
          items={[
            ['Vehicle type', displayValue(profile?.vehicle_type)],
            ['Plate number', displayValue(profile?.plate_number)],
            ['Primary errand area', displayValue(profile?.primary_errand_area)],
          ]}
        />
      </ReviewSection>

      <ReviewSection title="Payout account">
        <InfoGrid
          items={[
            ['Bank', displayValue(profile?.bank_name)],
            ['Account name', displayValue(profile?.account_name)],
            ['Account number', displayValue(profile?.account_number)],
          ]}
        />
      </ReviewSection>

      {item.proof_of_address || item.address_document_type ? (
        <ReviewSection title="Address proof">
          <InfoGrid
            items={[['Document type', displayValue(item.address_document_type)]]}
          />
        </ReviewSection>
      ) : null}

      <ReviewSection title="Documents">
        <DocumentGallery item={item} />
      </ReviewSection>

      {item.status === 'rejected' && item.rejection_reason ? (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-800">
          <p className="font-semibold mb-1">Rejection reason</p>
          <p>{item.rejection_reason}</p>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-success-50 text-success-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {actionSuccess}
        </div>
      ) : null}

      {actionError ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {actionError}
        </div>
      ) : null}

      {item.status === 'pending' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Reject reason (required to reject)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              rows={3}
              placeholder="Explain why this verification is rejected…"
              className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white pt-2">
            <button
              type="button"
              disabled={isApproving || isRejecting}
              onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success-500 text-white text-sm font-semibold hover:bg-success-600 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" /> {isApproving ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              disabled={isRejecting || isApproving || rejectReason.trim().length < 3}
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error-500 text-white text-sm font-semibold hover:bg-error-600 disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" /> {isRejecting ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-sm font-bold uppercase tracking-wide text-ink-500 mb-3">{title}</h4>
      {children}
    </section>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <Info key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-ink-50">
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-ink-900 break-words">{value}</p>
    </div>
  );
}

function DocumentGallery({ item }: { item: RunnerVerificationItem }) {
  const docs = [
    { label: 'ID front', href: item.id_document_front },
    { label: 'ID back', href: item.id_document_back },
    { label: 'Selfie', href: item.selfie_photo },
    { label: 'Proof of address', href: item.proof_of_address },
  ].filter((doc): doc is { label: string; href: string } => Boolean(doc.href));

  if (docs.length === 0) {
    return <p className="text-sm text-ink-400">No document uploads available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {docs.map((doc) => (
          <a
            key={doc.label}
            href={doc.href}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg border border-ink-200 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Open {doc.label}
          </a>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <DocumentPreview key={doc.label} label={doc.label} href={doc.href} />
        ))}
      </div>
    </div>
  );
}

function DocumentPreview({ label, href }: { label: string; href: string }) {
  const isPdf = href.toLowerCase().includes('.pdf');

  return (
    <div className="rounded-xl border border-ink-200 overflow-hidden bg-ink-50">
      <div className="px-3 py-2 border-b border-ink-200 text-xs font-semibold text-ink-600">
        {label}
      </div>
      {isPdf ? (
        <div className="p-6 text-sm text-ink-500">
          PDF document.{' '}
          <a href={href} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
            Open in new tab
          </a>
        </div>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" className="block">
          <img
            src={href}
            alt={label}
            className="w-full max-h-72 object-contain bg-white"
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
}
