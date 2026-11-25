import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pause, Pencil, Play, Plus, Store, Trash2 } from 'lucide-react';
import { formatCount } from '@/components/admin2/format';
import { Pager } from '@/components/admin2/shared/Pager';
import { TABLE_HEADER } from '@/components/admin2/shared/TableControls';
import { PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { Modal } from '@/components/ui/Modal';
import {
  deleteAdminPlaceCategory,
  reorderAdminPlaceCategories,
  setAdminPlaceCategoryActive,
} from '@/api/adminPlacesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { PlaceCategoryModal } from './PlaceCategoryModal';
import { placeCategoryIcon } from './placeCategoryIcons';
import type { AdminPlace, AdminPlaceCategory } from './presentation';

const PER_PAGE = 10;

const ICON_BUTTON =
  'flex size-[28px] items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8] disabled:cursor-not-allowed disabled:opacity-40';

const GRID_COLUMNS =
  'grid grid-cols-[minmax(180px,1.4fr)_minmax(160px,1.2fr)_72px_88px_180px] items-center gap-[10px] px-[16px]';

export function PlaceCategoriesCard({
  categories,
  places,
  busy,
  onChange,
  onNotice,
  onError,
}: {
  categories: AdminPlaceCategory[];
  places: AdminPlace[];
  busy: boolean;
  onChange: () => void;
  onNotice: (text: string) => void;
  onError?: (text: string) => void;
}) {
  const [editing, setEditing] = useState<AdminPlaceCategory | null | 'new'>(null);
  const [deleting, setDeleting] = useState<AdminPlaceCategory | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [page, setPage] = useState(1);

  const placeCountBySlug = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((place) => counts.set(place.category, (counts.get(place.category) ?? 0) + 1));
    return counts;
  }, [places]);

  const total = categories.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, lastPage);

  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const rows = useMemo(() => {
    const start = (safePage - 1) * PER_PAGE;
    return categories.slice(start, start + PER_PAGE);
  }, [categories, safePage]);

  const existingSlugs = categories.map((category) => category.slug);
  const actionBusy = busy || localBusy;

  const refresh = () => onChange();

  const toggle = async (category: AdminPlaceCategory) => {
    setLocalBusy(true);
    try {
      const updated = await setAdminPlaceCategoryActive(category.id, !category.is_active);
      refresh();
      onNotice(updated.is_active ? `“${updated.name}” is active.` : `“${updated.name}” is paused.`);
    } catch (err) {
      onError?.(getApiErrorMessage(err, 'Could not update category.'));
    } finally {
      setLocalBusy(false);
    }
  };

  const move = async (category: AdminPlaceCategory, direction: -1 | 1) => {
    const ids = categories.map((item) => item.id);
    const from = ids.indexOf(category.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    setLocalBusy(true);
    try {
      await reorderAdminPlaceCategories(ids);
      refresh();
    } catch (err) {
      onError?.(getApiErrorMessage(err, 'Could not reorder categories.'));
    } finally {
      setLocalBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const used = placeCountBySlug.get(deleting.slug) ?? 0;
    if (used > 0) {
      onNotice(`Pause “${deleting.name}” instead — ${used} place${used === 1 ? '' : 's'} still use it.`);
      setDeleting(null);
      return;
    }
    setLocalBusy(true);
    try {
      await deleteAdminPlaceCategory(deleting.id);
      onNotice(`“${deleting.name}” is deleted.`);
      setDeleting(null);
      refresh();
    } catch (err) {
      onError?.(getApiErrorMessage(err, 'Could not delete category.'));
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <>
      <section className="flex w-full flex-col overflow-hidden rounded-[14px] border border-[#e2e8e3] bg-white font-inter">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e2e8e3] px-[16px] py-[14px]">
          <div>
            <p className="text-[14px] font-semibold text-[#17211b]">Place categories</p>
            <p className="text-[11px] text-[#7c857f]">
              Filters and chips in Explore. Pause a category instead of deleting it when places still use it.
            </p>
          </div>
          <button type="button" onClick={() => setEditing('new')} className={PRIMARY_BUTTON}>
            <Plus className="size-[15px]" strokeWidth={2} />
            Add category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-[8px] px-[16px] py-[36px] text-center">
            <Store className="size-[24px] text-[#a3aca6]" strokeWidth={1.6} />
            <p className="text-[12px] font-semibold text-[#17211b]">No categories yet</p>
            <p className="max-w-[360px] text-[11px] text-[#7c857f]">Add supermarket, pharmacy, bank, and anything else runners visit.</p>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="mt-[4px] h-[34px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27]"
            >
              Add the first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
                <span>Category</span>
                <span>Description</span>
                <span>Places</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              {rows.map((category) => {
                const Icon = placeCategoryIcon(category.icon);
                const count = placeCountBySlug.get(category.slug) ?? 0;
                const absoluteIndex = categories.findIndex((item) => item.id === category.id);
                return (
                  <div
                    key={category.id}
                    className={`${GRID_COLUMNS} h-[64px] border-b border-[#e2e8e3] transition-colors last:border-b-0 hover:bg-[#fafcfa] ${
                      category.is_active ? '' : 'opacity-80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditing(category)}
                      className="flex min-w-0 items-center gap-[10px] text-left"
                    >
                      <span
                        className={`flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] ${
                          category.is_active ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#f1f4f2] text-[#7c857f]'
                        }`}
                      >
                        <Icon className="size-[15px]" strokeWidth={1.8} />
                      </span>
                      <span className="flex min-w-0 flex-col gap-[2px]">
                        <span className="truncate text-[12px] font-semibold text-[#17211b] hover:text-[#167d35]">{category.name}</span>
                        <span className="truncate font-mono text-[9px] text-[#7c857f]">{category.slug}</span>
                      </span>
                    </button>

                    <p className="truncate text-[11px] text-[#45514a]" title={category.description || undefined}>
                      {category.description || '—'}
                    </p>

                    <p className="tabular-nums text-[11px] font-semibold text-[#17211b]">{count}</p>

                    <div>
                      <span
                        className={`inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-semibold ${
                          category.is_active ? 'bg-[#eaf6ed] text-[#0d5e27]' : 'bg-[#f1f4f2] text-[#7c857f]'
                        }`}
                      >
                        <span className={`size-[5px] rounded-full ${category.is_active ? 'bg-[#167d35]' : 'bg-[#a3aca6]'}`} />
                        {category.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-[5px]">
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        disabled={actionBusy || absoluteIndex <= 0}
                        onClick={() => move(category, -1)}
                        aria-label="Move up"
                        title="Move up"
                      >
                        <ArrowUp className="size-[13px]" />
                      </button>
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        disabled={actionBusy || absoluteIndex < 0 || absoluteIndex >= categories.length - 1}
                        onClick={() => move(category, 1)}
                        aria-label="Move down"
                        title="Move down"
                      >
                        <ArrowDown className="size-[13px]" />
                      </button>
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        disabled={actionBusy}
                        onClick={() => toggle(category)}
                        aria-label={category.is_active ? 'Pause category' : 'Activate category'}
                        title={category.is_active ? 'Pause' : 'Activate'}
                      >
                        {category.is_active ? <Pause className="size-[13px]" /> : <Play className="size-[13px]" />}
                      </button>
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        disabled={actionBusy}
                        onClick={() => setEditing(category)}
                        aria-label="Edit category"
                        title="Edit"
                      >
                        <Pencil className="size-[13px]" />
                      </button>
                      <button
                        type="button"
                        className={`${ICON_BUTTON} hover:border-[#e5a5a5] hover:text-[#b84545]`}
                        disabled={actionBusy}
                        onClick={() => setDeleting(category)}
                        aria-label="Delete category"
                        title="Delete"
                      >
                        <Trash2 className="size-[13px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8e3] px-[16px] py-[12px]">
            <p className="text-[10px] text-[#7c857f]">
              Showing {formatCount(rows.length)} of {formatCount(total)} categor{total === 1 ? 'y' : 'ies'} · order controls Explore
              filter order
            </p>
            <Pager page={safePage} lastPage={lastPage} onChange={setPage} />
          </div>
        ) : null}
      </section>

      <PlaceCategoryModal
        open={editing != null}
        category={editing === 'new' ? null : editing}
        existingSlugs={existingSlugs}
        onClose={() => setEditing(null)}
        onSaved={(saved, mode) => {
          refresh();
          onNotice(mode === 'edit' ? `“${saved.name}” is updated.` : `“${saved.name}” is added.`);
        }}
      />

      <Modal open={deleting != null} onClose={() => (actionBusy ? undefined : setDeleting(null))} title="Delete category?" size="sm">
        {deleting ? (
          <div className="flex flex-col gap-[14px] font-inter">
            <p className="text-[12px] leading-relaxed text-[#45514a]">
              {(placeCountBySlug.get(deleting.slug) ?? 0) > 0
                ? `“${deleting.name}” is used by ${placeCountBySlug.get(deleting.slug)} place${
                    (placeCountBySlug.get(deleting.slug) ?? 0) === 1 ? '' : 's'
                  }. Pause it instead so those places keep a valid category.`
                : `“${deleting.name}” will be removed from the category list.`}
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={actionBusy}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
              >
                Keep it
              </button>
              {(placeCountBySlug.get(deleting.slug) ?? 0) > 0 || deleting.is_active ? (
                <button
                  type="button"
                  onClick={() => {
                    if (deleting.is_active) toggle(deleting);
                    setDeleting(null);
                  }}
                  disabled={actionBusy}
                  className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
                >
                  Pause instead
                </button>
              ) : null}
              {(placeCountBySlug.get(deleting.slug) ?? 0) === 0 ? (
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={actionBusy}
                  className="h-[36px] rounded-[8px] bg-[#b84545] px-[14px] text-[11px] font-semibold text-white hover:bg-[#9a3434] disabled:opacity-60"
                >
                  {actionBusy ? 'Deleting…' : 'Delete category'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
