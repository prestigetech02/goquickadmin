import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Filter, ShieldCheck, UserRound } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { getAdmin2UserHref } from '@/lib/adminNavigation';
import type { AdminAuditLogEntry } from '@/types/api';
import { Chip } from '../errand/parts';
import { areaLabel, areaTone, auditTime, methodTone, outcomeOf, submittedData } from './auditPresentation';

const SECONDARY =
  'flex h-[34px] items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]';

export function AuditEntryDrawer({
  entry,
  onClose,
  onFilterAdmin,
  onFilterUser,
}: {
  entry: AdminAuditLogEntry;
  onClose: () => void;
  onFilterAdmin: (adminId: number) => void;
  onFilterUser: (user: { id: number; name: string | null }) => void;
}) {
  const [copied, setCopied] = useState(false);
  const outcome = outcomeOf(entry);
  const method = methodTone(entry.method);
  const data = submittedData(entry.payload);
  const json = data ? JSON.stringify(data, null, 2) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const rows: Array<[string, string]> = [
    ['Admin', entry.admin?.name ?? 'Unknown'],
    ['When', `${auditTime(entry.created_at)} WAT`],
    ['Action key', entry.action],
    ['HTTP result', entry.status_code != null ? String(entry.status_code) : '—'],
    ['Record', entry.subject ? `${entry.subject.type} #${entry.subject.id}` : '—'],
    ['IP address', entry.ip_address ?? '—'],
    ['Device', entry.device ?? '—'],
  ];

  return (
    <Drawer
      open
      onClose={onClose}
      title={entry.label}
      subtitle={`Entry #${entry.id}`}
      width="lg"
      footer={
        <div className="flex flex-wrap gap-[8px] font-inter">
          {entry.admin ? (
            <button type="button" onClick={() => onFilterAdmin(entry.admin!.id)} className={SECONDARY}>
              <Filter className="size-[13px]" /> More from {entry.admin.name ?? 'this admin'}
            </button>
          ) : null}
          {entry.target_user ? (
            <button type="button" onClick={() => onFilterUser({ id: entry.target_user!.id, name: entry.target_user!.name })} className={SECONDARY}>
              <UserRound className="size-[13px]" /> All actions on this user
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-[18px] font-inter">
        <div className="flex flex-wrap items-center gap-[6px]">
          <Chip tone={outcome.tone} label={outcome.label} dot />
          <Chip tone={areaTone(entry.resource)} label={areaLabel(entry.resource)} />
          <span className="rounded-[4px] px-[6px] py-[2px] font-mono text-[10px] font-bold" style={{ backgroundColor: method.bg, color: method.color }}>
            {entry.method}
          </span>
          <span className="min-w-0 break-all font-mono text-[10px] text-[#7c857f]">{entry.path}</span>
        </div>

        {entry.approved_by ? (
          <div className="flex gap-[10px] rounded-[10px] border border-[#ddd3f3] bg-[#f6f2fd] p-[12px]">
            <ShieldCheck className="mt-px size-[16px] flex-shrink-0 text-[#6b46c1]" />
            <div>
              <p className="text-[12px] font-semibold text-[#17211b]">Approved by {entry.approved_by.name ?? 'a super admin'}</p>
              <p className="mt-[2px] text-[11px] leading-[1.5] text-[#45514a]">
                This was a protected action. A super admin entered their password to let {entry.admin?.name ?? 'this admin'} go ahead.
              </p>
            </div>
          </div>
        ) : null}

        {entry.target_user ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e2e8e3] p-[12px]">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#7c857f]">Affected account</p>
              <p className="truncate text-[12px] font-semibold text-[#17211b]">{entry.target_user.name ?? `User #${entry.target_user.id}`}</p>
              <p className="text-[10px] capitalize text-[#7c857f]">
                {entry.target_user.role === 'buyer' ? 'Requester' : entry.target_user.role} · #{entry.target_user.id}
              </p>
            </div>
            <Link to={getAdmin2UserHref(entry.target_user.id)} className="text-[11px] font-semibold text-[#167d35] hover:underline">
              Open profile
            </Link>
          </div>
        ) : null}

        <dl className="divide-y divide-[#eef2ef] rounded-[10px] border border-[#e2e8e3]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-[12px] py-[9px]">
              <dt className="text-[11px] text-[#7c857f]">{label}</dt>
              <dd className="break-all text-right text-[11px] font-medium text-[#17211b]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#17211b]">Submitted data</p>
            {data ? (
              <button type="button" onClick={() => void copy()} className="flex items-center gap-[4px] text-[11px] font-semibold text-[#45514a] hover:text-[#17211b]">
                {copied ? <Check className="size-[12px] text-[#167d35]" /> : <Copy className="size-[12px]" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </div>
          {data ? (
            <pre className="max-h-[360px] overflow-auto rounded-[10px] bg-[#f6f8f6] p-[12px] font-mono text-[11px] leading-[1.5] text-[#17211b] scrollbar-thin">
              {json}
            </pre>
          ) : (
            <p className="rounded-[10px] bg-[#f6f8f6] px-[12px] py-[10px] text-[11px] text-[#7c857f]">No request body was sent.</p>
          )}
          <p className="text-[10px] text-[#7c857f]">Passwords, tokens, OTPs and card fields are redacted before they are stored.</p>
        </div>
      </div>
    </Drawer>
  );
}
