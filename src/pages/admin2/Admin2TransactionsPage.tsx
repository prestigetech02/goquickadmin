import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileBarChart } from 'lucide-react';
import {
  downloadAdminTransactionsExport,
  fetchAdminTransactionsOverview,
  reconcileAdminTransactions,
  saveBlob,
} from '@/api/adminTransactionsApi';
import { formatNaira } from '@/components/admin2/format';
import { OUTLINE_BUTTON, PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { PaymentMixCard } from '@/components/admin2/transactions/PaymentMixCard';
import { DEFAULT_LEDGER_FILTERS, ledgerParams, type LedgerFilters } from '@/components/admin2/transactions/presentation';
import { TransactionKpiCards } from '@/components/admin2/transactions/TransactionKpiCards';
import { TransactionLedgerCard } from '@/components/admin2/transactions/TransactionLedgerCard';
import { VolumeFeesCard } from '@/components/admin2/transactions/VolumeFeesCard';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminTransactionsOverview, TransactionReconcileResult } from '@/types/api';

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function financeReportCsv(overview: AdminTransactionsOverview): string {
  const { kpis, range, provider } = overview;
  const rows: Array<Array<string | number | null>> = [
    ['GoQuick finance report'],
    ['Period', range.start_date, range.end_date],
    ['Compared with', range.previous_start_date, range.previous_end_date],
    [],
    ['Metric', 'Amount (NGN)', 'Count', 'Change vs previous period (%)'],
    ['Transaction volume', kpis.volume.amount, kpis.volume.count, kpis.volume.change_pct],
    ['Successful payments', kpis.payments.amount, kpis.payments.count, kpis.payments.change_pct],
    ['Failed payments', kpis.refunds.failed_amount, kpis.payments.failed_count, null],
    ['Payment success rate (%)', kpis.payments.success_rate, null, null],
    ['Escrow held (live)', kpis.escrow.amount, kpis.escrow.count, null],
    ['Refunds', kpis.refunds.refund_amount, kpis.refunds.refund_count, null],
    ['Platform fees', kpis.fees.amount, null, kpis.fees.change_pct],
    ['Effective fee rate on errand value (%)', kpis.fees.effective_pct, null, null],
    [],
    ['Platform fee breakdown', 'Amount (NGN)'],
    ['Commission', kpis.fees.breakdown.commission],
    ['Service fees', kpis.fees.breakdown.service_fee],
    ['Cancellation fees', kpis.fees.breakdown.cancellation_fee],
    ['Withdrawal fees', kpis.fees.breakdown.withdrawal_fee],
    [],
    ['Payment method', 'Amount (NGN)', 'Payments', 'Share (%)'],
    ...overview.methods.map((m) => [m.label, m.amount, m.count, m.share_pct]),
    [],
    ['Provider', provider.name],
    ['Collections success rate (%)', provider.collections.success_rate],
    ['Paystack fees (NGN)', provider.collections.fees],
    ['Payouts paid', provider.payouts.paid_count, provider.payouts.paid_amount],
    ['Payouts in flight', provider.payouts.in_flight],
    ['Payouts rejected', provider.payouts.rejected],
    ['Open checkouts', provider.open_checkouts.count, provider.open_checkouts.amount],
    [],
    [overview.series.bucket === 'week' ? 'Week starting' : 'Date', 'Until', 'Volume (NGN)', 'Entries', 'Platform fees (NGN)'],
    ...overview.series.points.map((p) => [p.start, p.end, p.volume, p.count, p.fees]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function reconcileSummary(result: TransactionReconcileResult): string {
  if (result.checked === 0) return 'Paystack is in sync. There were no open checkouts to reconcile.';
  const parts = [`Checked ${result.checked} open checkout${result.checked === 1 ? '' : 's'}`];
  if (result.settled > 0) parts.push(`${result.settled} settled (${formatNaira(result.settled_amount)})`);
  if (result.failed > 0) parts.push(`${result.failed} closed as failed`);
  if (result.still_open > 0) parts.push(`${result.still_open} still awaiting payment`);
  if (result.errors > 0) parts.push(`${result.errors} could not be checked`);
  let text = `${parts.join(' · ')}.`;
  if (result.remaining > 0) text += ` ${result.remaining} more left. Run reconcile again to continue.`;
  return text;
}

export function Admin2TransactionsPage() {
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_LEDGER_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => ledgerParams(filters, debouncedSearch, range), [filters, debouncedSearch, range]);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.payments.transactionsOverview(overviewParams),
    queryFn: () => fetchAdminTransactionsOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });

  const reconcileMutation = useMutation({
    mutationFn: reconcileAdminTransactions,
    onSuccess: (result) => {
      setNotice({ tone: result.errors > 0 && result.settled === 0 && result.failed === 0 ? 'error' : 'ok', text: reconcileSummary(result) });
      void queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not reconcile with Paystack.') }),
  });

  const exportLedger = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminTransactionsExport(params);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not export transactions.') });
    } finally {
      setExporting(false);
    }
  };

  const generateReport = () => {
    const overview = overviewQuery.data;
    if (!overview) return;
    const blob = new Blob([financeReportCsv(overview)], { type: 'text/csv;charset=utf-8' });
    saveBlob(blob, `goquick-finance-report-${overview.range.start_date}-to-${overview.range.end_date}.csv`);
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Finance operations · Live"
        title="Transactions"
        subtitle="Monitor platform money movement, provider performance and settlement readiness."
        actions={
          <>
            <button type="button" onClick={exportLedger} disabled={exporting} className={OUTLINE_BUTTON}>
              <Download className="size-[15px]" strokeWidth={1.8} />
              {exporting ? 'Exporting…' : 'Export report'}
            </button>
            <button type="button" onClick={generateReport} disabled={!overviewQuery.data} className={PRIMARY_BUTTON}>
              <FileBarChart className="size-[15px]" strokeWidth={1.8} />
              Generate finance report
            </button>
          </>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load finance metrics.')}
        </p>
      ) : null}

      <TransactionKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <VolumeFeesCard overview={overviewQuery.data} />
        <PaymentMixCard overview={overviewQuery.data} />
      </div>

      <TransactionLedgerCard
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        params={params}
        rangeLabel={range}
        onReconcile={() => reconcileMutation.mutate()}
        reconciling={reconcileMutation.isPending}
      />
    </div>
  );
}
