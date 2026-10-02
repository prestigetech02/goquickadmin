import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import { fetchAdminKycReview } from '@/api/adminKycApi';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminKycDetail } from '@/types/api';
import { formatCount, relativeAgo, shortAge } from '../format';
import { watDate, watTime } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { userTone } from '../transactions/presentation';
import { CHECK_COLORS, CHECK_ICONS, DUPLICATE_FIELDS, RISK_TONES, statusChip } from './presentation';
import type { KycDecision } from './KycDecisionModal';

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

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[2px]">{children}</div>;
}

function stamp(iso: string | null): string {
  return iso ? `${watDate(iso)}, ${watTime(iso)}` : '—';
}

function Timeline({ detail }: { detail: AdminKycDetail }) {
  const steps: Array<{ label: string; at: string | null; note?: string; tone: string }> = [
    { label: 'Joined GoQuick', at: detail.activity.joined_at, tone: '#7c857f' },
  ];
  if (detail.submitted_at) {
    steps.push({
      label: detail.stage === 'incomplete' ? 'Started verification' : 'Submitted for review',
      at: detail.submitted_at,
      note: detail.document.label ?? undefined,
      tone: '#2c73b9',
    });
  }
  if (detail.stage === 'ready') {
    steps.push({
      label: detail.sla_breached ? 'Past the review target' : 'Awaiting review',
      at: null,
      note: detail.submitted_at ? `Waiting ${shortAge(detail.submitted_at)}` : undefined,
      tone: detail.sla_breached ? '#b06d12' : '#7c857f',
    });
  }
  if (detail.stage === 'approved' || detail.stage === 'rejected') {
    steps.push({
      label: detail.stage === 'approved' ? 'Approved' : 'Rejected',
      at: detail.reviewed_at,
      note: detail.reviewer ? `by ${detail.reviewer.name}` : undefined,
      tone: detail.stage === 'approved' ? '#167d35' : '#b84545',
    });
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

function Documents({ documents }: { documents: AdminKycDetail['documents'] }) {
  if (documents.length === 0) {
    return <p className="text-[11px] text-[#7c857f]">No documents uploaded yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3">
      {documents.map((doc) => (
        <a
          key={doc.key}
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col overflow-hidden rounded-[10px] border border-[#e2e8e3] hover:border-[#167d35]"
        >
          {doc.kind === 'image' ? (
            <img src={doc.url} alt={doc.label} loading="lazy" className="h-[96px] w-full bg-[#f1f4f2] object-cover" />
          ) : (
            <span className="flex h-[96px] w-full items-center justify-center bg-[#f8faf8]">
              <FileText className="size-[26px] text-[#7c857f]" strokeWidth={1.5} />
            </span>
          )}
          <span className="truncate px-[8px] py-[6px] text-[10px] font-semibold text-[#17211b] group-hover:text-[#167d35]">{doc.label}</span>
        </a>
      ))}
    </div>
  );
}

export function KycReviewDrawer({
  id,
  onClose,
  onAction,
}: {
  id: number;
  onClose: () => void;
  onAction: (kind: KycDecision, detail: AdminKycDetail) => void;
}) {
  const { user: admin } = useAuth();
  const canOpenProfiles = canAccessPage(admin, 'admin2-runner');
  const query = useQuery({
    queryKey: queryKeys.runners.kycReview(id),
    queryFn: () => fetchAdminKycReview(id),
  });
  const detail = query.data;
  const runner = detail?.runner;
  const name = runner?.name ?? 'Unknown runner';
  const status = detail ? statusChip(detail) : null;
  const profileHref = runner && canOpenProfiles ? getAdmin2RunnerHref(runner.id) : null;

  const footer = detail ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {profileHref ? (
        <Link to={profileHref} className="text-[12px] font-semibold text-[#167d35] hover:underline">
          Open runner profile →
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
        {detail.can_revoke ? (
          <button
            type="button"
            onClick={() => onAction('revoke', detail)}
            className="h-[36px] rounded-[8px] border border-[#f0c9c9] bg-white px-[14px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fdeded]"
          >
            Revoke verification
          </button>
        ) : null}
        {detail.can_approve ? (
          <button
            type="button"
            onClick={() => onAction('approve', detail)}
            className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27]"
          >
            {detail.stage === 'rejected' ? 'Approve anyway' : 'Approve runner'}
          </button>
        ) : null}
      </div>
    </div>
  ) : undefined;

  return (
    <Drawer open onClose={onClose} title={name} subtitle="Runner verification" width="xl" footer={footer}>
      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[90px] w-full" />
          <Skeleton className="h-[140px] w-full" />
          <Skeleton className="h-[180px] w-full" />
        </div>
      ) : null}
      {query.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[12px] font-medium text-[#b84545]">
          {getApiErrorMessage(query.error, 'Could not load this verification.')}
        </p>
      ) : null}

      {detail && status ? (
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-[14px] rounded-[10px] bg-[#f8faf8] p-[14px]">
            {detail.selfie_url ? (
              <a href={detail.selfie_url} target="_blank" rel="noreferrer" title="Open selfie" className="flex-shrink-0">
                <img src={detail.selfie_url} alt={`${name} selfie`} className="size-[64px] rounded-[12px] object-cover" />
              </a>
            ) : (
              <PersonAvatar name={name} tone={userTone('runner')} size={64} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold text-[#17211b]">{detail.identity.full_name ?? name}</p>
              <p className="truncate text-[11px] text-[#7c857f]">{[runner?.phone, runner?.email].filter(Boolean).join(' · ') || '—'}</p>
              <p className="mt-[2px] truncate text-[10px] text-[#7c857f]">
                {[runner?.city, detail.submitted_at ? `Submitted ${relativeAgo(detail.submitted_at)}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-[6px]">
              <Chip tone={status.tone} label={status.label} dot />
              {detail.activity.is_suspended ? <Chip tone={RISK_TONES.red} label="Suspended" /> : null}
            </div>
          </div>

          <Section title={`Checklist · ${detail.checks_passed}/${detail.checks_total} complete`}>
            <div className="flex flex-col">
              {detail.checks.map((check) => {
                const Icon = CHECK_ICONS[check.key];
                const colors = CHECK_COLORS[check.status];
                return (
                  <div key={check.key} className="flex items-center gap-[10px] border-b border-[#e2e8e3] py-[8px] last:border-b-0">
                    <span className="flex size-[28px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: colors.bg }}>
                      <Icon className="size-[14px]" strokeWidth={1.8} color={colors.color} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[#17211b]">{check.label}</p>
                      {check.detail ? <p className="truncate text-[10px] text-[#7c857f]">{check.detail}</p> : null}
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: colors.color }}>
                      {colors.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Risk signals">
            {detail.risks.length === 0 ? (
              <p className="flex items-center gap-[8px] rounded-[8px] bg-[#eaf6ed] px-[10px] py-[8px] text-[11px] font-medium text-[#0d5e27]">
                <ShieldCheck className="size-[14px]" strokeWidth={1.8} />
                No risk signals on this submission.
              </p>
            ) : (
              <div className="flex flex-wrap gap-[6px]">
                {detail.risks.map((risk) => (
                  <Chip key={risk.key} tone={RISK_TONES[risk.tone]} label={risk.label} />
                ))}
              </div>
            )}
            {detail.duplicates.length > 0 ? (
              <div className="flex flex-col rounded-[10px] border border-[#f0c9c9] bg-[#fffafa] px-[12px] py-[4px]">
                {detail.duplicates.map((dup) => {
                  const href = canOpenProfiles ? (dup.role === 'runner' ? getAdmin2RunnerHref(dup.user_id) : getAdmin2UserHref(dup.user_id)) : null;
                  return (
                    <div key={`${dup.field}-${dup.user_id}`} className="flex items-center gap-[8px] border-b border-[#f6dede] py-[7px] text-[11px] last:border-b-0">
                      <AlertTriangle className="size-[12px] flex-shrink-0 text-[#b84545]" strokeWidth={1.8} />
                      <span className="text-[#b84545]">{DUPLICATE_FIELDS[dup.field]} as</span>
                      {href ? (
                        <Link to={href} className="truncate font-semibold text-[#17211b] hover:text-[#167d35] hover:underline">
                          {dup.name}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-[#17211b]">{dup.name}</span>
                      )}
                      <span className="ml-auto flex-shrink-0 text-[10px] capitalize text-[#7c857f]">
                        {[dup.role, dup.status].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Section>

          <Section title="Documents">
            <Documents documents={detail.documents} />
            <p className="text-[10px] text-[#7c857f]">Compare the selfie with the ID photo and confirm the name and ID number match what the runner entered.</p>
          </Section>

          <Section title="Identity">
            <Panel>
              <Row label="Document" value={detail.document.label ?? '—'} />
              <Row label="ID number" value={detail.identity.id_number ?? '—'} mono />
              <Row
                label="Date of birth"
                value={
                  detail.identity.date_of_birth ? (
                    <span className={detail.identity.age != null && detail.identity.age < 18 ? 'text-[#b84545]' : undefined}>
                      {watDate(detail.identity.date_of_birth)}
                      {detail.identity.age != null ? ` · ${detail.identity.age} yrs` : ''}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <Row label="Gender" value={<span className="capitalize">{detail.identity.gender ?? '—'}</span>} />
              <Row label="BVN" value={detail.identity.bvn_masked ?? '—'} mono />
              <Row label="Previous workplace" value={detail.identity.previous_workplace ?? '—'} />
            </Panel>
          </Section>

          <Section title="Guarantors">
            {detail.guarantors.length === 0 ? (
              <p className="text-[11px] text-[#7c857f]">No guarantors provided.</p>
            ) : (
              <div className="grid gap-[8px] sm:grid-cols-2">
                {detail.guarantors.map((guarantor, index) => (
                  <div
                    key={index}
                    className={`rounded-[10px] border px-[12px] py-[10px] ${guarantor.conflict ? 'border-[#f3d9ae] bg-[#fffaf1]' : 'border-[#e2e8e3]'}`}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Guarantor {index + 1}</p>
                    <p className="mt-[2px] truncate text-[12px] font-semibold text-[#17211b]">{guarantor.name ?? '—'}</p>
                    <p className="truncate font-mono text-[11px] text-[#45514a]">{guarantor.phone ?? '—'}</p>
                    <p className="line-clamp-2 text-[10px] text-[#7c857f]">{guarantor.address ?? 'No address'}</p>
                    {guarantor.conflict ? (
                      <p className="mt-[4px] flex items-center gap-[4px] text-[10px] font-medium text-[#b06d12]">
                        <AlertTriangle className="size-[11px]" strokeWidth={1.8} />
                        Phone matches the runner or the other guarantor
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {detail.next_of_kin ? (
              <Panel>
                <Row label="Next of kin" value={detail.next_of_kin.name ?? '—'} />
                <Row label="Phone" value={detail.next_of_kin.phone ?? '—'} mono />
                {detail.next_of_kin.address ? <Row label="Address" value={detail.next_of_kin.address} /> : null}
              </Panel>
            ) : null}
          </Section>

          <Section title="Vehicle & payout">
            <Panel>
              <Row label="Vehicle" value={detail.vehicle.type ?? '—'} />
              <Row label="Plate number" value={detail.vehicle.plate ?? '—'} mono />
              <Row label="Service area" value={detail.area ?? '—'} />
              <Row label="Bank" value={detail.payout?.bank_name ?? '—'} />
              <Row label="Account number" value={detail.payout?.account_masked ?? '—'} mono />
              <Row
                label="Account name"
                value={
                  detail.payout?.account_name ? (
                    <span className="inline-flex items-center gap-[6px]">
                      {detail.payout.account_name}
                      {detail.payout.name_matches === false ? <Chip tone={RISK_TONES.amber} label="Differs from profile" /> : null}
                      {detail.payout.name_matches === true ? <Chip tone={RISK_TONES.green} label="Matches" /> : null}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            </Panel>
          </Section>

          <Section title="Account activity">
            <div className="grid grid-cols-3 gap-[8px]">
              {[
                { label: 'Joined', value: detail.activity.joined_at ? watDate(detail.activity.joined_at) : '—' },
                { label: 'Last seen', value: detail.activity.last_seen_at ? relativeAgo(detail.activity.last_seen_at) : 'Never' },
                { label: 'Errands done', value: `${formatCount(detail.activity.errands_completed)} of ${formatCount(detail.activity.errands_total)}` },
              ].map((item) => (
                <div key={item.label} className="rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                  <p className="text-[9px] text-[#7c857f]">{item.label}</p>
                  <p className="truncate text-[12px] font-semibold text-[#17211b]">{item.value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Timeline">
            <Timeline detail={detail} />
            {detail.rejection_reason ? (
              <p className="rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px] text-[11px] text-[#45514a]">
                <span className="font-semibold text-[#17211b]">Reason sent to runner: </span>
                {detail.rejection_reason}
              </p>
            ) : null}
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
}
