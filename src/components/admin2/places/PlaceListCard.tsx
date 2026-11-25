import { useEffect, useMemo, useState } from 'react';
import { Eye, ImageOff, Pause, Pencil, Play, Store, Trash2 } from 'lucide-react';
import { formatCount } from '@/components/admin2/format';
import { Pager } from '@/components/admin2/shared/Pager';
import { TABLE_HEADER } from '@/components/admin2/shared/TableControls';
import {
  categoryLabel,
  coordsLabel,
  coverImage,
  placeLocality,
  type AdminPlace,
  type AdminPlaceCategory,
} from './presentation';

const PER_PAGE = 10;

const ICON_BUTTON =
  'flex size-[28px] items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8] disabled:cursor-not-allowed disabled:opacity-40';

/** Place · Category · Location · Contact · Status · Actions */
const GRID_COLUMNS =
  'grid grid-cols-[minmax(200px,1.35fr)_110px_minmax(200px,1.6fr)_100px_88px_148px] items-center gap-[10px] px-[16px]';

export type PlaceHandlers = {
  view: (place: AdminPlace) => void;
  edit: (place: AdminPlace) => void;
  toggle: (place: AdminPlace) => void;
  remove: (place: AdminPlace) => void;
};

function PlaceThumb({ place }: { place: AdminPlace }) {
  const src = coverImage(place);
  const extra = Math.max(0, (place.images?.length ?? 0) - 1);

  if (!src) {
    return (
      <span className="flex size-[44px] flex-shrink-0 items-center justify-center rounded-[9px] border border-[#e2e8e3] bg-[#f1f4f2] text-[#a3aca6]">
        <ImageOff className="size-[16px]" strokeWidth={1.6} />
      </span>
    );
  }

  return (
    <span className="relative size-[44px] flex-shrink-0 overflow-hidden rounded-[9px] border border-[#e2e8e3] bg-[#f8faf8]">
      <img src={src} alt="" className={`size-full object-cover ${place.is_active ? '' : 'opacity-70'}`} />
      {extra > 0 ? (
        <span className="absolute bottom-[3px] right-[3px] rounded-[4px] bg-black/65 px-[4px] py-[1px] text-[8px] font-semibold text-white">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

export function PlaceListCard({
  places,
  categories,
  busy,
  handlers,
  onCreate,
  filterKey = '',
}: {
  places: AdminPlace[];
  categories: AdminPlaceCategory[];
  busy: boolean;
  handlers: PlaceHandlers;
  onCreate: () => void;
  /** Change this when search/filters change so paging resets to page 1. */
  filterKey?: string;
}) {
  const [page, setPage] = useState(1);
  const total = places.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, lastPage);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const rows = useMemo(() => {
    const start = (safePage - 1) * PER_PAGE;
    return places.slice(start, start + PER_PAGE);
  }, [places, safePage]);

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-[14px] border border-[#e2e8e3] bg-white font-inter">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e2e8e3] px-[16px] py-[14px]">
        <div>
          <p className="text-[14px] font-semibold text-[#17211b]">All places</p>
          <p className="text-[11px] text-[#7c857f]">
            Curated stops requesters can open into Create errand.
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-[8px] px-[16px] py-[36px] text-center">
          <Store className="size-[24px] text-[#a3aca6]" strokeWidth={1.6} />
          <p className="text-[12px] font-semibold text-[#17211b]">No places yet</p>
          <p className="max-w-[360px] text-[11px] text-[#7c857f]">
            Add a supermarket, pharmacy, or bank with photos and a map pin so requesters can start errands from Explore.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-[4px] h-[34px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27]"
          >
            Add the first place
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
              <span>Place</span>
              <span>Category</span>
              <span>Location</span>
              <span>Contact</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {rows.map((place) => (
              <div
                key={place.id}
                className={`${GRID_COLUMNS} h-[72px] border-b border-[#e2e8e3] transition-colors last:border-b-0 hover:bg-[#fafcfa] ${
                  place.is_active ? '' : 'opacity-80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handlers.edit(place)}
                  className="flex min-w-0 items-center gap-[10px] text-left"
                >
                  <PlaceThumb place={place} />
                  <span className="flex min-w-0 flex-col gap-[2px]">
                    <span className="truncate text-[12px] font-semibold text-[#17211b] hover:text-[#167d35]" title={place.name}>
                      {place.name}
                    </span>
                    <span
                      className="truncate text-[9px] text-[#7c857f]"
                      title={place.description || place.notes || undefined}
                    >
                      {place.description?.trim() || place.notes || 'No description'}
                    </span>
                  </span>
                </button>

                <div>
                  <span className="inline-flex rounded-full bg-[#f3f0fa] px-[8px] py-[2px] text-[10px] font-semibold text-[#735ca8]">
                    {categoryLabel(place.category, categories)}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[#17211b]" title={place.address_line}>
                    {place.address_line || '—'}
                  </p>
                  <p
                    className="truncate text-[9px] text-[#7c857f]"
                    title={`${placeLocality(place)} · ${coordsLabel(place.latitude, place.longitude)}`}
                  >
                    {placeLocality(place) || 'No area/city'} · {coordsLabel(place.latitude, place.longitude)}
                  </p>
                </div>

                <p className="truncate text-[11px] text-[#45514a]" title={place.phone ?? undefined}>
                  {place.phone || '—'}
                </p>

                <div>
                  <span
                    className={`inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-semibold ${
                      place.is_active ? 'bg-[#eaf6ed] text-[#0d5e27]' : 'bg-[#f1f4f2] text-[#7c857f]'
                    }`}
                  >
                    <span className={`size-[5px] rounded-full ${place.is_active ? 'bg-[#167d35]' : 'bg-[#a3aca6]'}`} />
                    {place.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-[5px]">
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    disabled={busy}
                    onClick={() => handlers.view(place)}
                    aria-label="View place"
                    title="View"
                  >
                    <Eye className="size-[13px]" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    disabled={busy}
                    onClick={() => handlers.toggle(place)}
                    aria-label={place.is_active ? 'Pause place' : 'Activate place'}
                    title={place.is_active ? 'Pause' : 'Activate'}
                  >
                    {place.is_active ? <Pause className="size-[13px]" /> : <Play className="size-[13px]" />}
                  </button>
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    disabled={busy}
                    onClick={() => handlers.edit(place)}
                    aria-label="Edit place"
                    title="Edit"
                  >
                    <Pencil className="size-[13px]" />
                  </button>
                  <button
                    type="button"
                    className={`${ICON_BUTTON} hover:border-[#e5a5a5] hover:text-[#b84545]`}
                    disabled={busy}
                    onClick={() => handlers.remove(place)}
                    aria-label="Delete place"
                    title="Delete"
                  >
                    <Trash2 className="size-[13px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8e3] px-[16px] py-[12px]">
          <p className="text-[10px] text-[#7c857f]">
            Showing {formatCount(rows.length)} of {formatCount(total)} place{total === 1 ? '' : 's'}
          </p>
          <Pager page={safePage} lastPage={lastPage} onChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}
