import { FileText } from 'lucide-react';
import type { AdminErrandView } from '@/types/api';
import { Card } from '../overview/primitives';
import { watTime } from './errandPresentation';
import { Chip, SectionHeader } from './parts';

type Upload = { key: string; url: string; caption: string; isImage: boolean };

const PROOF_CHIPS: Record<string, { label: string; tone: { bg: string; color: string } }> = {
  pending: { label: 'Awaiting requester review', tone: { bg: '#fff5e5', color: '#b06d12' } },
  accepted: { label: 'Accepted by requester', tone: { bg: '#eaf6ed', color: '#0d5e27' } },
  rejected: { label: 'Rejected by requester', tone: { bg: '#fdeded', color: '#b84545' } },
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif)(\?|$)/i;

export function ProofCard({ view }: { view: AdminErrandView }) {
  const { proof, attachments } = view;
  const uploads: Upload[] = [
    ...(proof?.photos ?? []).map((url, index) => ({
      key: `proof-${index}`,
      url,
      caption: `Proof photo ${index + 1}${proof?.submitted_at ? ` · ${watTime(proof.submitted_at)}` : ''}`,
      isImage: true,
    })),
    ...attachments
      .filter((a) => a.url)
      .map((a) => ({
        key: `attachment-${a.id}`,
        url: a.url as string,
        caption: `Requester · ${a.name ?? 'Attachment'}`,
        isImage: (a.type ?? '').startsWith('image') || IMAGE_EXT.test(a.url ?? ''),
      })),
  ];
  const proofCount = proof?.photos.length ?? 0;
  const subtitle = proofCount
    ? `${proofCount} upload${proofCount === 1 ? '' : 's'} from the assigned runner${attachments.length ? ` · ${attachments.length} from requester` : ''}`
    : attachments.length
      ? `${attachments.length} upload${attachments.length === 1 ? '' : 's'} from the requester`
      : 'No proof uploaded yet';
  const chip = proof?.status ? PROOF_CHIPS[proof.status] : null;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <SectionHeader title="Proof & attachments" subtitle={subtitle} />
      {uploads.length > 0 ? (
        <div className="grid grid-cols-2 gap-[10px]">
          {uploads.map((upload) => (
            <a key={upload.key} href={upload.url} target="_blank" rel="noreferrer" className="group flex min-w-0 flex-col gap-[7px]">
              {upload.isImage ? (
                <img
                  src={upload.url}
                  alt={upload.caption}
                  className="h-[110px] w-full rounded-[8px] object-cover transition-opacity group-hover:opacity-90"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-[110px] w-full items-center justify-center rounded-[8px] bg-[#f8faf8] text-[#7c857f]">
                  <FileText className="size-[24px]" strokeWidth={1.5} />
                </span>
              )}
              <p className="truncate text-[10px] font-semibold text-[#17211b] group-hover:text-[#167d35]">{upload.caption}</p>
            </a>
          ))}
        </div>
      ) : null}
      {chip ? (
        <div className="flex flex-col items-start gap-[6px]">
          <Chip tone={chip.tone} label={chip.label} dot />
          {proof?.rejection_reason ? <p className="text-[10px] text-[#b84545]">Reason: {proof.rejection_reason}</p> : null}
          {proof?.notes ? <p className="text-[10px] text-[#45514a]">Runner note: {proof.notes}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
