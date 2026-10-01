import type { AdminErrandView } from '@/types/api';
import { formatNaira } from '../format';
import { Card } from '../overview/primitives';
import { watDate, watTime } from './errandPresentation';
import { Chip, SectionHeader } from './parts';

const STATUS_CHIPS: Record<string, { label: string; tone: { bg: string; color: string } }> = {
  held: { label: 'Held in escrow', tone: { bg: '#eaf6ed', color: '#0d5e27' } },
  released: { label: 'Released to runner', tone: { bg: '#eaf6ed', color: '#0d5e27' } },
  refunded: { label: 'Refunded to requester', tone: { bg: '#f1f4f2', color: '#45514a' } },
  pending: { label: 'Payment pending', tone: { bg: '#fff5e5', color: '#b06d12' } },
  unpaid: { label: 'Not yet paid', tone: { bg: '#fff5e5', color: '#b06d12' } },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[11px]">
      <p className="text-[#45514a]">{label}</p>
      <p className="font-semibold text-[#17211b]">{value}</p>
    </div>
  );
}

export function PricingCard({ view }: { view: AdminErrandView }) {
  const { pricing } = view;
  const chip = STATUS_CHIPS[pricing.status] ?? { label: pricing.status, tone: { bg: '#f1f4f2', color: '#45514a' } };
  const escrow = pricing.source === 'escrow';
  const totalNote = pricing.subsidy > 0
    ? `GoQuick covers ${formatNaira(pricing.subsidy)} of the runner's pay`
    : pricing.held_at
      ? `Held ${watDate(pricing.held_at)}, ${watTime(pricing.held_at)}`
      : escrow
        ? null
        : 'Service fee shown at the current rate';

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader
        title="Pricing & payment"
        subtitle={escrow ? 'Escrow secured · paid from requester wallet' : 'Quote from the requester · no payment taken yet'}
      />
      <Row label={escrow ? 'Errand price' : 'Quoted price'} value={pricing.job_amount != null ? formatNaira(pricing.job_amount) : '—'} />
      <Row label="Service fee" value={formatNaira(pricing.service_fee)} />
      {pricing.coupon_discount > 0 ? (
        <Row label={`Promo${pricing.coupon_code ? ` · ${pricing.coupon_code}` : ''}`} value={`−${formatNaira(pricing.coupon_discount)}`} />
      ) : null}
      <div className="h-px w-full bg-[#e2e8e3]" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className="text-[11px] font-semibold text-[#17211b]">{escrow ? 'Total paid' : 'Estimated total'}</p>
          {totalNote ? <p className="text-[9px] text-[#7c857f]">{totalNote}</p> : null}
        </div>
        <p className="flex-shrink-0 text-[16px] font-bold text-[#17211b]">{pricing.total != null ? formatNaira(pricing.total) : '—'}</p>
      </div>
      <div>
        <Chip tone={chip.tone} label={chip.label} dot />
      </div>
    </Card>
  );
}
