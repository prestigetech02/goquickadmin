import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ExternalLink, FileBadge, ScanFace, type LucideProps } from 'lucide-react';
import type { AdminRunnerProfile } from '@/types/api';
import { Card } from '../overview/primitives';
import { watDate } from '../errand/errandPresentation';
import { Chip, SectionHeader } from '../errand/parts';
import { DOCUMENT_STATES } from './presentation';

const ICONS: Record<AdminRunnerProfile['documents'][number]['key'], ComponentType<LucideProps>> = {
  id_front: BadgeCheck,
  id_back: BadgeCheck,
  selfie: ScanFace,
  address: FileBadge,
};

export function DocumentsCard({ documents, manageHref }: { documents: AdminRunnerProfile['documents']; manageHref: string | null }) {
  return (
    <Card className="flex w-full flex-col gap-[12px] p-[18px]">
      <SectionHeader
        title="Documents"
        subtitle="KYC files submitted in the runner app"
        action={manageHref ? (
          <Link to={manageHref} className="flex-shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#167d35] hover:underline">
            Manage
          </Link>
        ) : null}
      />
      {documents.length === 0 ? (
        <p className="rounded-[8px] bg-[#f8faf8] px-[12px] py-[14px] text-center text-[11px] text-[#7c857f]">No documents uploaded yet.</p>
      ) : null}
      {documents.map((doc) => {
        const Icon = ICONS[doc.key];
        const state = DOCUMENT_STATES[doc.status];
        return (
          <a
            key={doc.key}
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-[10px] rounded-[8px] bg-[#f8faf8] p-[10px] transition-colors hover:bg-[#eef2ef]"
          >
            <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[6px] bg-[#eaf6ed]">
              <Icon className="size-[15px]" strokeWidth={1.8} color="#167d35" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="flex items-center gap-[5px] text-[10px] font-semibold text-[#17211b]">
                <span className="truncate">{doc.label}</span>
                <ExternalLink className="size-[10px] flex-shrink-0 text-[#7c857f] opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="truncate text-[9px] text-[#7c857f]">{doc.uploaded_at ? `Uploaded ${watDate(doc.uploaded_at)}` : 'Upload date unknown'}</span>
            </span>
            <Chip tone={state.tone} label={state.label} />
          </a>
        );
      })}
    </Card>
  );
}
