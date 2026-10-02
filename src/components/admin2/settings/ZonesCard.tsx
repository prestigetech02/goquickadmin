import { useQuery } from '@tanstack/react-query';
import { fetchAdminZoneStats, fetchAdminZones } from '@/api/adminZonesApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { Chip, SectionLink } from '../errand/parts';
import { formatCount, formatNaira } from '../format';
import { Skeleton } from '../overview/primitives';
import { TABLE_HEADER } from '../shared/TableControls';
import { AMBER, GRAY, GREEN } from '../userDetails/presentation';
import { LoadError, SettingsCard } from './parts';

const PREVIEW = { page: 1, per_page: 6 };

export function ZonesCard({ onManage }: { onManage?: () => void }) {
  const zonesQuery = useQuery({ queryKey: queryKeys.zones.list(PREVIEW), queryFn: () => fetchAdminZones(PREVIEW) });
  const statsQuery = useQuery({ queryKey: queryKeys.zones.stats, queryFn: fetchAdminZoneStats });
  const zones = zonesQuery.data?.zones;
  const stats = statsQuery.data;
  const total = zonesQuery.data?.pagination.total ?? 0;

  return (
    <SettingsCard
      id="zones"
      title="Service zones"
      subtitle={
        stats
          ? `${formatCount(stats.active)} active of ${formatCount(stats.total)} zones · ${formatCount(stats.assigned_runners ?? 0)} runners assigned`
          : 'Where GoQuick operates and the base pricing in each area.'
      }
      action={onManage ? <SectionLink onClick={onManage}>Manage zones</SectionLink> : null}
    >
      {zonesQuery.isError ? <LoadError text={getApiErrorMessage(zonesQuery.error, 'Could not load zones.')} /> : null}
      {!zonesQuery.isError ? (
        <div className="-mx-[18px] -my-[16px] overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className={TABLE_HEADER}>
                <th className="px-[18px] font-semibold">Zone</th>
                <th className="px-[12px] font-semibold">City</th>
                <th className="px-[12px] font-semibold">Base fee</th>
                <th className="px-[12px] font-semibold">Per km</th>
                <th className="px-[12px] font-semibold">Runners</th>
                <th className="px-[18px] text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {!zones
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i} className="border-t border-[#eef1ee]">
                      <td colSpan={6} className="px-[18px] py-[12px]">
                        <Skeleton className="h-[14px] w-full" />
                      </td>
                    </tr>
                  ))
                : null}
              {zones && zones.length === 0 ? (
                <tr className="border-t border-[#eef1ee]">
                  <td colSpan={6} className="px-[18px] py-[20px] text-center text-[11px] text-[#7c857f]">
                    No service zones yet.
                  </td>
                </tr>
              ) : null}
              {zones?.map((zone) => (
                <tr key={zone.id} className="border-t border-[#eef1ee] text-[12px] text-[#17211b]">
                  <td className="px-[18px] py-[11px] font-semibold">{zone.name}</td>
                  <td className="px-[12px] py-[11px] text-[#45514a]">{[zone.city, zone.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-[12px] py-[11px] tabular-nums">{formatNaira(zone.base_fee)}</td>
                  <td className="px-[12px] py-[11px] tabular-nums">{formatNaira(zone.per_km_rate)}</td>
                  <td className="px-[12px] py-[11px] tabular-nums">{formatCount(zone.runners_count ?? 0)}</td>
                  <td className="px-[18px] py-[11px] text-right">
                    {!zone.active ? (
                      <Chip tone={GRAY} label="Paused" dot />
                    ) : zone.has_boundary ? (
                      <Chip tone={GREEN} label="Active" dot />
                    ) : (
                      <Chip tone={AMBER} label="No boundary" dot />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {zones && total > zones.length ? (
            <p className="border-t border-[#eef1ee] px-[18px] py-[10px] text-[10px] text-[#7c857f]">
              Showing {zones.length} of {formatCount(total)} zones.
            </p>
          ) : null}
        </div>
      ) : null}
    </SettingsCard>
  );
}
