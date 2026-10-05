import { ArrowDown, ArrowUp, ImageOff, Pencil, Trash2 } from 'lucide-react';
import type { AdminBanner } from '@/types/api';
import { AUDIENCE_LABELS, DISPLAY_LABELS, FREQUENCY_LABELS, STATUS_LABELS, STATUS_STYLES, linkLabel, scheduleLabel } from './presentation';

const ICON_BUTTON =
  'flex size-[30px] items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8] disabled:cursor-not-allowed disabled:opacity-40';

export type BannerHandlers = {
  edit: (banner: AdminBanner) => void;
  toggle: (banner: AdminBanner) => void;
  remove: (banner: AdminBanner) => void;
  move: (banner: AdminBanner, direction: -1 | 1) => void;
};

export function BannerListCard({
  banners,
  loading,
  busy,
  handlers,
  onCreate,
}: {
  banners: AdminBanner[];
  loading: boolean;
  busy: boolean;
  handlers: BannerHandlers;
  onCreate: () => void;
}) {
  return (
    <section className="flex w-full flex-col gap-[14px] rounded-[14px] border border-[#e2e8e3] bg-white p-[18px] font-inter">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[#17211b]">All banners</p>
          <p className="text-[11px] text-[#7c857f]">
            Home banners slide in this order. When several popups are due, people see the highest one first, one per app open.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-[10px]">
          {[0, 1].map((i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-[12px] bg-[#f1f4f2]" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center gap-[8px] rounded-[12px] border border-dashed border-[#d4ddd6] px-[16px] py-[36px] text-center">
          <ImageOff className="size-[24px] text-[#a3aca6]" strokeWidth={1.6} />
          <p className="text-[12px] font-semibold text-[#17211b]">No banners yet</p>
          <p className="max-w-[360px] text-[11px] text-[#7c857f]">Upload an image, pick who sees it and save. It appears the next time people open the app.</p>
          <button type="button" onClick={onCreate} className="mt-[4px] h-[34px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27]">
            Create the first banner
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {banners.map((banner, index) => (
            <li key={banner.id} className="flex flex-col gap-[12px] rounded-[12px] border border-[#e2e8e3] p-[12px] sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => handlers.edit(banner)}
                className="flex w-full flex-shrink-0 justify-center rounded-[8px] bg-[#f8faf8] sm:w-[210px]"
                aria-label={`Edit ${banner.title}`}
              >
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className={`rounded-[8px] border border-[#e2e8e3] object-cover ${
                    banner.display === 'popup' ? 'aspect-[4/5] h-[110px]' : 'aspect-[3/1] w-full'
                  } ${banner.status === 'live' ? '' : 'opacity-60'}`}
                />
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <p className="truncate text-[13px] font-semibold text-[#17211b]">{banner.title}</p>
                  <span className={`rounded-full px-[8px] py-[2px] text-[10px] font-semibold ${STATUS_STYLES[banner.status]}`}>{STATUS_LABELS[banner.status]}</span>
                </div>
                <div className="flex flex-wrap gap-[6px]">
                  <span className="rounded-full bg-[#f3f0fa] px-[8px] py-[2px] text-[10px] font-semibold text-[#735ca8]">
                    {banner.display === 'popup' ? `Popup · ${FREQUENCY_LABELS[banner.popup_frequency].toLowerCase()}` : DISPLAY_LABELS.inline}
                  </span>
                  {banner.audiences.map((audience) => (
                    <span key={audience} className="rounded-full bg-[#f1f4f2] px-[8px] py-[2px] text-[10px] font-semibold text-[#45514a]">
                      {AUDIENCE_LABELS[audience]}
                    </span>
                  ))}
                </div>
                <p className="truncate text-[11px] text-[#7c857f]">
                  {linkLabel(banner)} · {scheduleLabel(banner)}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-[6px]">
                <button type="button" className={ICON_BUTTON} disabled={busy || index === 0} onClick={() => handlers.move(banner, -1)} aria-label="Move up">
                  <ArrowUp className="size-[14px]" />
                </button>
                <button type="button" className={ICON_BUTTON} disabled={busy || index === banners.length - 1} onClick={() => handlers.move(banner, 1)} aria-label="Move down">
                  <ArrowDown className="size-[14px]" />
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={banner.is_active}
                  aria-label={banner.is_active ? 'Pause banner' : 'Switch banner on'}
                  disabled={busy}
                  onClick={() => handlers.toggle(banner)}
                  className={`relative mx-[4px] h-[20px] w-[36px] flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${banner.is_active ? 'bg-[#167d35]' : 'bg-[#c9d2cc]'}`}
                >
                  <span className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow transition-[left] ${banner.is_active ? 'left-[18px]' : 'left-[2px]'}`} />
                </button>
                <button type="button" className={ICON_BUTTON} disabled={busy} onClick={() => handlers.edit(banner)} aria-label="Edit">
                  <Pencil className="size-[14px]" />
                </button>
                <button type="button" className={`${ICON_BUTTON} text-[#b84545]`} disabled={busy} onClick={() => handlers.remove(banner)} aria-label="Delete">
                  <Trash2 className="size-[14px]" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
