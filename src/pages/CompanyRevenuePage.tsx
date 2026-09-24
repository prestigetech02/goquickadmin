import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CircleDollarSign,
  HandCoins,
  Percent,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { fetchCompanyRevenue } from '@/api/adminCompanyRevenueApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, formatDateTime, titleCase } from '@/lib/utils';
import type { CompanyRevenueEntry } from '@/types/api';

type RangePreset = 'today' | '7d' | '30d' | 'custom';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rangeForPreset(preset: RangePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === 'today') {
    // same day
  } else if (preset === '7d') {
    from.setDate(from.getDate() - 6);
  } else {
    from.setDate(from.getDate() - 29);
  }
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

function streamLabel(type: string): string {
  switch (type) {
    case 'commission':
      return 'Commission';
    case 'service_fee':
      return 'Service fee';
    case 'cancellation_fee':
      return 'Cancellation fee';
    case 'withdrawal_fee':
      return 'Withdrawal fee';
    default:
      return titleCase(type.replace(/_/g, ' '));
  }
}

export function CompanyRevenuePage() {
  const navigate = useAdminNavigate();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const initial = rangeForPreset('30d');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      from,
      to,
      page,
      per_page: 25,
    }),
    [from, to, page],
  );

  const revenueQuery = useQuery({
    queryKey: queryKeys.payments.companyRevenue(params),
    queryFn: () => fetchCompanyRevenue(params),
  });

  const summary = revenueQuery.data?.summary;
  const entries = revenueQuery.data?.entries.data ?? [];
  const total = revenueQuery.data?.entries.total ?? 0;

  function applyPreset(next: RangePreset) {
    setPreset(next);
    if (next === 'custom') return;
    const range = rangeForPreset(next);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  }

  const columns: Column<CompanyRevenueEntry>[] = [
    {
      key: 'occurred_at',
      header: 'When',
      render: (row) => formatDateTime(row.occurred_at),
    },
    {
      key: 'type',
      header: 'Stream',
      render: (row) => <Badge status={row.type} label={streamLabel(row.type)} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-ink-900">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => {
        if (row.errand_id) {
          return (
            <button
              type="button"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
              onClick={() => navigate('errands', { openId: row.errand_id! })}
            >
              Errand #{row.errand_id}
              {row.errand?.title ? ` · ${row.errand.title}` : ''}
            </button>
          );
        }
        if (row.withdrawal_id) {
          return (
            <button
              type="button"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
              onClick={() => navigate('payments', { openId: row.withdrawal_id! })}
            >
              Withdrawal #{row.withdrawal_id}
              {row.withdrawal?.reference ? ` · ${row.withdrawal.reference}` : ''}
            </button>
          );
        }
        return <span className="text-ink-400">—</span>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Company revenue"
        subtitle="Gross platform take from commissions, service fees, cancellation fees, and withdrawal fees."
        action={
          <button
            type="button"
            onClick={() => void revenueQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <RefreshCw className={`w-4 h-4${revenueQuery.isFetching ? ' animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
          {(
            [
              ['today', 'Today'],
              ['7d', '7 days'],
              ['30d', '30 days'],
              ['custom', 'Custom'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                preset === key ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="text-sm text-ink-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPreset('custom');
              setFrom(e.target.value);
              setPage(1);
            }}
            className="ml-2 rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-ink-600">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPreset('custom');
              setTo(e.target.value);
              setPage(1);
            }}
            className="ml-2 rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {revenueQuery.isError ? (
        <Card className="mb-6 p-4 text-sm text-error-700">
          {getApiErrorMessage(revenueQuery.error, 'Could not load company revenue.')}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total company take"
          value={formatCurrency(summary?.total ?? 0)}
          icon={<CircleDollarSign className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Commission"
          value={formatCurrency(summary?.commission ?? 0)}
          icon={<Percent className="w-5 h-5" />}
          accent="brand"
        />
        <StatCard
          label="Service fees"
          value={formatCurrency(summary?.service_fee ?? 0)}
          icon={<HandCoins className="w-5 h-5" />}
        />
        <StatCard
          label="Cancellation fees"
          value={formatCurrency(summary?.cancellation_fee ?? 0)}
          icon={<Undo2 className="w-5 h-5" />}
          accent="warning"
        />
        <StatCard
          label="Withdrawal fees"
          value={formatCurrency(summary?.withdrawal_fee ?? 0)}
          icon={<Banknote className="w-5 h-5" />}
        />
      </div>

      {revenueQuery.data?.note ? (
        <p className="text-sm text-ink-500 mb-4">{revenueQuery.data.note}</p>
      ) : null}

      <Card>
        <DataTable
          columns={columns}
          data={entries}
          loading={revenueQuery.isLoading}
          emptyMessage="No ledger entries in this range yet. Historical take still appears in the summary cards."
          page={page}
          pageSize={25}
          total={total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
