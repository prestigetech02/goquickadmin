import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { fetchAdminErrandTypes, updateAdminErrandType } from '@/api/adminErrandTypesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminErrandType } from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { SectionLink } from '../errand/parts';
import { formatCount, formatPct } from '../format';
import { Skeleton } from '../overview/primitives';
import { TABLE_HEADER } from '../shared/TableControls';
import { DROPOFF_LABELS, errandTypeIcon } from './errandTypeIcons';
import { ErrandTypeModal } from './ErrandTypeModal';
import { LoadError, SettingsCard, Switch } from './parts';

export function CategoriesCard({ canEdit, onOpenAnalytics }: { canEdit: boolean; onOpenAnalytics?: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.settings.errandTypes, queryFn: fetchAdminErrandTypes });
  const data = query.data;
  const [editing, setEditing] = useState<AdminErrandType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const toggle = useMutation({
    mutationFn: (type: AdminErrandType) =>
      updateAdminErrandType(type.slug, {
        name: type.name,
        icon: type.icon ?? 'puzzle-piece',
        description: type.description,
        is_active: !type.is_active,
        sort_order: type.sort_order,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.errandTypes }),
  });

  const openEditor = (type: AdminErrandType | null) => {
    setEditing(type);
    setModalOpen(true);
  };

  const others = data?.other_categories ?? [];
  const columns = canEdit ? 6 : 5;

  return (
    <SettingsCard
      id="categories"
      title="Service categories"
      subtitle={`Errand types offered in the requester app, with errands requested in the last ${data?.window_days ?? 30} days.`}
      action={
        <>
          {onOpenAnalytics ? <SectionLink onClick={onOpenAnalytics}>View analytics</SectionLink> : null}
          {canEdit ? (
            <button
              type="button"
              onClick={() => openEditor(null)}
              className="flex h-[30px] items-center gap-[6px] rounded-[8px] bg-[#167d35] px-[10px] text-[11px] font-semibold text-white hover:bg-[#0d5e27]"
            >
              <Plus className="size-[13px]" strokeWidth={2} />
              Add type
            </button>
          ) : null}
        </>
      }
    >
      {query.isError ? <LoadError text={getApiErrorMessage(query.error, 'Could not load errand types.')} /> : null}
      {toggle.isError ? <LoadError text={getApiErrorMessage(toggle.error, 'Could not update this errand type.')} /> : null}
      {!query.isError ? (
        <div className="-mx-[18px] -my-[16px] overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className={TABLE_HEADER}>
                <th className="px-[18px] font-semibold">Type</th>
                <th className="px-[12px] font-semibold">Errands</th>
                <th className="px-[12px] font-semibold">Share of demand</th>
                <th className="px-[12px] font-semibold">Completion</th>
                <th className="px-[12px] font-semibold">In app</th>
                {canEdit ? <th className="px-[18px]" aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {!data
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i} className="border-t border-[#eef1ee]">
                      <td colSpan={columns} className="px-[18px] py-[12px]">
                        <Skeleton className="h-[14px] w-full" />
                      </td>
                    </tr>
                  ))
                : null}
              {data?.types.map((type) => {
                const Icon = errandTypeIcon(type.icon);
                return (
                  <tr key={type.slug} className={`border-t border-[#eef1ee] text-[12px] ${type.is_active ? 'text-[#17211b]' : 'text-[#7c857f]'}`}>
                    <td className="px-[18px] py-[10px]">
                      <div className="flex items-center gap-[10px]">
                        <span
                          className={`flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px] ${type.is_active ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#f1f4f2] text-[#7c857f]'}`}
                        >
                          <Icon className="size-[14px]" strokeWidth={1.8} />
                        </span>
                        <div className="flex min-w-0 flex-col gap-[2px]">
                          <span className="truncate font-semibold">{type.name}</span>
                          <span className="truncate text-[10px] text-[#7c857f]">
                            <span className="font-mono">{type.slug}</span> · {DROPOFF_LABELS[type.dropoff]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-[12px] py-[10px] tabular-nums">{formatCount(type.errands)}</td>
                    <td className="px-[12px] py-[10px]">
                      <ShareBar pct={type.share_pct} muted={!type.is_active} />
                    </td>
                    <td className="px-[12px] py-[10px] tabular-nums text-[#45514a]">
                      {type.errands > 0 ? formatPct((type.completed / type.errands) * 100) : '—'}
                    </td>
                    <td className="px-[12px] py-[10px]">
                      {canEdit ? (
                        <Switch
                          checked={type.is_active}
                          disabled={toggle.isPending}
                          onChange={() => toggle.mutate(type)}
                          label={`Show ${type.name} in the requester app`}
                        />
                      ) : (
                        <span className="text-[11px]">{type.is_active ? 'Shown' : 'Hidden'}</span>
                      )}
                    </td>
                    {canEdit ? (
                      <td className="px-[18px] py-[10px] text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(type)}
                          aria-label={`Edit ${type.name}`}
                          className="inline-flex size-[28px] items-center justify-center rounded-[7px] text-[#45514a] hover:bg-[#f1f4f2]"
                        >
                          <Pencil className="size-[13px]" strokeWidth={1.8} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {others.length > 0 ? (
            <p className="border-t border-[#eef1ee] px-[18px] py-[10px] text-[10px] leading-[1.5] text-[#7c857f]">
              Also requested (WhatsApp or older errands):{' '}
              {others.map((other) => `${categoryLabel(other.key)} (${formatCount(other.errands)})`).join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      <ErrandTypeModal open={modalOpen} type={editing} icons={data?.icons ?? []} onClose={() => setModalOpen(false)} />
    </SettingsCard>
  );
}

function ShareBar({ pct, muted }: { pct: number; muted: boolean }) {
  return (
    <div className="flex items-center gap-[8px]">
      <span className="h-[6px] w-[90px] overflow-hidden rounded-full bg-[#eef1ee]">
        <span className={`block h-full rounded-full ${muted ? 'bg-[#a9b3ac]' : 'bg-[#167d35]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className="text-[11px] tabular-nums text-[#45514a]">{formatPct(pct)}</span>
    </div>
  );
}
