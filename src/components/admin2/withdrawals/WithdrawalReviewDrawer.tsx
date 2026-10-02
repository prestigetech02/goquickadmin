import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchAdminWithdrawalReview } from '@/api/adminWithdrawalsApi';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminWithdrawalDetail } from '@/types/api';
import { formatCount, formatNaira, relativeAgo } from '../format';
import { watDate, watTime } from '../errand/errandPresentation';
import { Chip } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { KYC_LABELS, RISK_TONES, STAGE_LABELS, rowStatus, stageTone } from './presentation';
import type { WithdrawalDecision } from './WithdrawalDecisionModal';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#e2e8e3] py-[8px] text-[12px] last:border-b-0">
      <span className="flex-shrink-0 text-[#7c857f]">{label}</span>
      <span className={`min-w-0 break-words text-right font-semibold text-[#17211b] ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}

function stamp(iso: string | null): string {
  return iso ? `${watDate(iso)}, ${watTime(iso)}` : '—';
}

function Timeline({ detail }: { detail: AdminWithdrawalDetail }) {
  const steps: Array<{ label: string; at: string | null; note?: string; tone: string }> = [
    { label: 'Requested', at: detail.created_at, note: `${formatNaira(detail.amount)} + ${formatNaira(detail.fee)} fee reserved from wallet`, tone: '#b06d12' },
  ];
  if (detail.stage === 'pending' && detail.due_at) {
    steps.push({
      label: detail.sla_breached ? 'Payout SLA breached' : 'Payout due',
      at: detail.due_at,
      note: detail.sla_breached ? 'Promised payout time has passed' : 'Promised to the runner when they requested',
      tone: detail.sla_breached ? '#b84545' : '#7c857f',
    });
  }
  if (detail.reviewed_at || detail.reviewer) {
    steps.push({
      label: detail.stage === 'rejected' ? 'Rejected' : 'Approved',
      at: detail.reviewed_at,
      note: detail.reviewer ? `by ${detail.reviewer.name}` : undefined,
      tone: detail.stage === 'rejected' ? '#b84545' : '#2c73b9',
    });
  }
  if (detail.payout.status === 'pending') {
    steps.push({ label: 'Transfer in flight', at: null, note: detail.payout.reference ?? undefined, tone: '#735ca8' });
  } else if (detail.payout.status === 'failed' || detail.payout.status === 'reversed') {
    steps.push({
      label: detail.payout.status === 'reversed' ? 'Transfer reversed' : 'Transfer failed',
      at: null,
      note: detail.payout.message ?? undefined,
      tone: '#b84545',
    });
  }
  if (detail.stage === 'paid') {
    steps.push({ label: 'Paid', at: detail.processed_at, note: detail.payout.reference ? `Transfer ${detail.payout.reference}` : 'Marked paid manually', tone: '#167d35' });
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`} className="relative flex gap-[10px] pb-[12px] last:pb-0">
          {index < steps.length - 1 ? <span className="absolute left-[4px] top-[12px] h-[calc(100%-8px)] w-px bg-[#e2e8e3]" /> : null}
          <span className="mt-[4px] size-[9px] flex-shrink-0 rounded-full" style={{ backgroundColor: step.tone }} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#17211b]">{step.label}</p>
            <p className="text-[10px] text-[#7c857f]">{[step.at ? stamp(step.at) : null, step.note].filter(Boolean).join(' · ')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WithdrawalReviewDrawer({
  id,
  onClose,
  onAction,
}: {
  id: number;
  onClose: () => void;
  onAction: (kind: WithdrawalDecision, detail: AdminWithdrawalDetail) => void;
}) {
  const { user: admin } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.payments.withdrawalReview(id),
    queryFn: () => fetchAdminWithdrawalReview(id),
  });
  const detail = query.data;
  const person = detail?.user;
  const profileHref =
    person && person.role !== 'admin' && canAccessPage(admin, 'admin2-runner')
      ? person.role === 'runner'
        ? getAdmin2RunnerHref(person.id)
        : getAdmin2UserHref(person.id)
      : null;
  const status = detail ? rowStatus(detail) : null;

  const footer = detail ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {profileHref ? (
        <Link to={profileHref} className="text-[12px] font-semibold text-[#167d35] hover:underline">
          Open {person?.role === 'runner' ? 'runner' : 'user'} profile →
        </Link>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        {detail.can_reject ? (
          <button
            type="button"
            onClick={() => onAction('reject', detail)}
            className="h-[36px] rounded-[8px] border border-[#f0c9c9] bg-white px-[14px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fdeded]"
          >
            Reject
          </button>
        ) : null}
        {detail.can_mark_paid ? (
          <button
            type="button"
            onClick={() => onAction('mark-paid', detail)}
            className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            Mark paid
          </button>
        ) : null}
        {detail.can_approve ? (
          <button
            type="button"
            onClick={() => onAction('approve', detail)}
            className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27]"
          >
            {detail.stage === 'approved' ? 'Retry payout' : 'Approve & pay'}
          </button>
        ) : null}
      </div>
    </div>
  ) : undefined;

  return (
    <Drawer open onClose={onClose} title={detail?.code ?? 'Withdrawal'} subtitle={person?.name} width="lg" footer={footer}>
      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[160px] w-full" />
        </div>
      ) : null}
      {query.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[12px] font-medium text-[#b84545]">
          {getApiErrorMessage(query.error, 'Could not load this withdrawal.')}
        </p>
      ) : null}

      {detail && status ? (
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-start justify-between gap-3 rounded-[10px] bg-[#f8faf8] p-[14px]">
            <div className="min-w-0">
              <p className="text-[24px] font-bold leading-none tracking-[-0.5px] text-[#17211b]">{formatNaira(detail.amount)}</p>
              <p className="mt-[6px] text-[11px] text-[#7c857f]">
                Requested {relativeAgo(detail.created_at)} · {formatNaira(detail.fee)} fee
              </p>
            </div>
            <Chip tone={status.tone} label={status.label} dot />
          </div>

          <Section title="Risk signals">
            {detail.risks.length === 0 && !detail.sla_breached ? (
              <p className="flex items-center gap-[8px] rounded-[8px] bg-[#eaf6ed] px-[10px] py-[8px] text-[11px] font-medium text-[#0d5e27]">
                <ShieldCheck className="size-[14px]" strokeWidth={1.8} />
                No risk signals on this request.
              </p>
            ) : (
              <div className="flex flex-wrap gap-[6px]">
                {detail.sla_breached ? <Chip tone={RISK_TONES.red} label="SLA breached" /> : null}
                {detail.risks.map((risk) => (
                  <Chip key={risk.key} tone={risk.severity === 'high' ? RISK_TONES.red : RISK_TONES.amber} label={risk.label} />
                ))}
              </div>
            )}
            {detail.risks.some((risk) => risk.key === 'shared_account') ? (
              <p className="flex items-start gap-[6px] text-[10px] text-[#b84545]">
                <AlertTriangle className="mt-[1px] size-[12px] flex-shrink-0" strokeWidth={1.8} />
                This account number is also used by another GoQuick user.
              </p>
            ) : null}
          </Section>

          <Section title="Payout account">
            <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[2px]">
              <Row label="Bank" value={detail.bank.name ?? '—'} />
              <Row label="Account number" value={detail.account_number ?? '—'} mono />
              <Row label="Account name" value={detail.bank.account_name ?? '—'} />
              <Row label="Profile name" value={person?.name ?? '—'} />
              <Row label="KYC" value={KYC_LABELS[detail.kyc_status]} />
            </div>
          </Section>

          <Section title="Wallet">
            <div className="grid grid-cols-3 gap-[8px]">
              {[
                { label: 'Balance now', value: formatNaira(detail.wallet.balance) },
                { label: 'Paid before', value: `${formatCount(detail.wallet.paid_count)} · ${formatNaira(detail.wallet.paid_amount)}` },
                { label: 'Open requests', value: formatCount(detail.wallet.open_count) },
              ].map((item) => (
                <div key={item.label} className="rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                  <p className="text-[9px] text-[#7c857f]">{item.label}</p>
                  <p className="truncate text-[12px] font-semibold text-[#17211b]">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#7c857f]">The requested amount and fee were already taken from the balance when the runner asked for payout.</p>
          </Section>

          <Section title="Timeline">
            <Timeline detail={detail} />
            {detail.reason ? (
              <p className="rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px] text-[11px] text-[#45514a]">
                <span className="font-semibold text-[#17211b]">Reason: </span>
                {detail.reason}
              </p>
            ) : null}
          </Section>

          <Section title="Recent withdrawals">
            {detail.history.length === 0 ? (
              <p className="text-[11px] text-[#7c857f]">This is their first withdrawal request.</p>
            ) : (
              <div className="flex flex-col">
                {detail.history.map((item) => (
                  <div key={item.id} className="flex items-center gap-[10px] border-b border-[#e2e8e3] py-[8px] last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[#17211b]">{item.code}</p>
                      <p className="truncate text-[9px] text-[#7c857f]">
                        {[item.created_at ? watDate(item.created_at) : null, item.bank_name, item.same_account ? 'Same account' : 'Different account']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#17211b]">{formatNaira(item.amount)}</span>
                    <Chip tone={stageTone(item.stage)} label={STAGE_LABELS[item.stage]} />
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
}
