import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { deleteAdminBanner, fetchAdminBanners, reorderAdminBanners, setAdminBannerActive } from '@/api/adminBannersApi';
import { BannerFormDrawer, type BannerFormMode } from '@/components/admin2/banners/BannerFormDrawer';
import { BannerListCard, type BannerHandlers } from '@/components/admin2/banners/BannerListCard';
import { AUDIENCES, AUDIENCE_LABELS } from '@/components/admin2/banners/presentation';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminBanner } from '@/types/api';

type MutationInput =
  | { action: 'toggle'; banner: AdminBanner }
  | { action: 'delete'; banner: AdminBanner }
  | { action: 'reorder'; ids: number[] };

export function Admin2BannersPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [formMode, setFormMode] = useState<BannerFormMode | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);

  const listQuery = useQuery({ queryKey: queryKeys.banners.all, queryFn: fetchAdminBanners });
  const banners = listQuery.data?.banners ?? [];
  const summary = listQuery.data?.summary;

  const mutation = useMutation({
    mutationFn: async (input: MutationInput): Promise<AdminBanner | null> => {
      if (input.action === 'delete') {
        await deleteAdminBanner(input.banner.id);
        return null;
      }
      if (input.action === 'reorder') {
        await reorderAdminBanners(input.ids);
        return null;
      }
      return setAdminBannerActive(input.banner.id, !input.banner.is_active);
    },
    onSuccess: (result, input) => {
      if (input.action === 'delete') {
        setDeleting(null);
        setNotice({ tone: 'ok', text: `“${input.banner.title}” is deleted.` });
      } else if (input.action === 'toggle' && result) {
        setNotice({
          tone: 'ok',
          text: result.is_active
            ? result.status === 'live'
              ? `“${result.title}” is live again.`
              : `“${result.title}” is switched on, but it is ${result.status} so nobody sees it yet.`
            : `“${result.title}” is paused.`,
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'That action failed.') }),
  });

  const handlers: BannerHandlers = {
    edit: (banner) => setFormMode({ kind: 'edit', banner }),
    toggle: (banner) => mutation.mutate({ action: 'toggle', banner }),
    remove: (banner) => setDeleting(banner),
    move: (banner, direction) => {
      const ids = banners.map((item) => item.id);
      const from = ids.indexOf(banner.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      mutation.mutate({ action: 'reorder', ids });
    },
  };

  const onSaved = (banner: AdminBanner, mode: BannerFormMode) => {
    setFormMode(null);
    const verb = mode.kind === 'edit' ? 'updated' : 'created';
    setNotice({
      tone: 'ok',
      text:
        banner.status === 'live'
          ? `“${banner.title}” is ${verb} and live. People see it the next time they open the app.`
          : `“${banner.title}” is ${verb}. It is ${banner.status}, so nobody sees it yet.`,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.banners.all });
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Content · Promotions"
        title="Banners"
        actionsBesideTitle
        subtitle="Show an image banner on the requester app and web, the runner app or the landing page. Changes reach people the next time they open the app; no app update needed."
        actions={
          <button type="button" onClick={() => setFormMode({ kind: 'create' })} className={PRIMARY_BUTTON}>
            <Plus className="size-[15px]" strokeWidth={2} />
            New banner
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {listQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(listQuery.error, 'Could not load banners.')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        {AUDIENCES.map((audience) => {
          const inline = summary?.live_by_audience[audience]?.inline ?? 0;
          const popup = summary?.live_by_audience[audience]?.popup ?? 0;
          return (
            <div key={audience} className="flex flex-col gap-[4px] rounded-[12px] border border-[#e2e8e3] bg-white p-[14px] font-inter">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#7c857f]">{AUDIENCE_LABELS[audience]}</p>
              <p className="text-[22px] font-bold text-[#17211b]">{summary ? inline + popup : '–'}</p>
              <p className="text-[11px] text-[#7c857f]">
                {inline === 0
                  ? audience === 'requester'
                    ? 'No home banner; the referral promo shows'
                    : 'No home banner live'
                  : `${inline} home banner${inline === 1 ? '' : 's'}`}
                {popup > 0 ? ` · ${popup} popup${popup === 1 ? '' : 's'}` : ''}
              </p>
            </div>
          );
        })}
      </div>

      <BannerListCard banners={banners} loading={listQuery.isLoading} busy={mutation.isPending} handlers={handlers} onCreate={() => setFormMode({ kind: 'create' })} />

      {formMode ? (
        <BannerFormDrawer key={formMode.kind === 'create' ? 'create' : `edit-${formMode.banner.id}`} mode={formMode} onClose={() => setFormMode(null)} onSaved={onSaved} />
      ) : null}

      <Modal open={deleting != null} onClose={() => (mutation.isPending ? undefined : setDeleting(null))} title="Delete banner?" size="sm">
        {deleting ? (
          <div className="flex flex-col gap-[14px] font-inter">
            <img
              src={deleting.image_url}
              alt={deleting.title}
              className={`rounded-[8px] border border-[#e2e8e3] object-cover ${deleting.display === 'popup' ? 'mx-auto aspect-[4/5] h-[180px]' : 'aspect-[3/1] w-full'}`}
            />
            <p className="text-[12px] leading-relaxed text-[#45514a]">
              “{deleting.title}” disappears from every app and the landing page within a minute. To bring it back later, pause it instead.
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={mutation.isPending}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
              >
                Keep it
              </button>
              {deleting.is_active ? (
                <button
                  type="button"
                  onClick={() => {
                    mutation.mutate({ action: 'toggle', banner: deleting });
                    setDeleting(null);
                  }}
                  disabled={mutation.isPending}
                  className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
                >
                  Pause instead
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => mutation.mutate({ action: 'delete', banner: deleting })}
                disabled={mutation.isPending}
                className="h-[36px] rounded-[8px] bg-[#b84545] px-[14px] text-[11px] font-semibold text-white hover:bg-[#9a3434] disabled:opacity-60"
              >
                {mutation.isPending ? 'Deleting…' : 'Delete banner'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
