import { useEffect, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ErrandDetails, ErrandListItem, Paginated } from '@/types/api';
import { getEcho } from './echo';
import { queryKeys } from './queryKeys';

type ErrandStatusPayload = {
  errand_id?: number;
  status?: string;
  updated_at?: string;
};

function patchErrandStatusInCaches(
  qc: QueryClient,
  errandId: number,
  status: string,
  updatedAt?: string,
): void {
  qc.setQueriesData<Paginated<ErrandListItem>>(
    { queryKey: queryKeys.errands.all },
    (old) => {
      if (!old || !Array.isArray(old.data)) return old;
      let changed = false;
      const data = old.data.map((row) => {
        if (row.id !== errandId) return row;
        changed = true;
        return {
          ...row,
          status,
          updated_at: updatedAt ?? row.updated_at,
        };
      });
      return changed ? { ...old, data } : old;
    },
  );

  qc.setQueryData<ErrandDetails>(queryKeys.errands.detail(errandId), (old) => {
    if (!old || old.id !== errandId) return old;
    return {
      ...old,
      status,
      updated_at: updatedAt ?? old.updated_at,
    };
  });
}

/**
 * Subscribe to private-admin.dashboard for errand status updates.
 * Patches list/detail caches immediately and invalidates ops/dashboard stats.
 */
export function useAdminOpsRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLive(false);
      return;
    }

    const echo = getEcho();
    if (!echo) {
      setLive(false);
      return;
    }

    const channelName = 'admin.dashboard';
    let cancelled = false;

    try {
      const channel = echo.private(channelName);
      setLive(false);

      channel.subscribed(() => {
        if (!cancelled) setLive(true);
      });
      channel.error(() => {
        if (!cancelled) setLive(false);
      });

      channel.listen('.errand.status.updated', (payload: ErrandStatusPayload) => {
        if (cancelled) return;

        const errandId = Number(payload?.errand_id) || 0;
        const status = String(payload?.status || '').trim();
        const updatedAt = payload?.updated_at ? String(payload.updated_at) : undefined;

        if (errandId > 0 && status) {
          patchErrandStatusInCaches(qc, errandId, status, updatedAt);
        }

        void qc.invalidateQueries({ queryKey: queryKeys.errands.opsStats });
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
        void qc.invalidateQueries({ queryKey: queryKeys.errands.all });
      });
    } catch {
      setLive(false);
      return;
    }

    return () => {
      cancelled = true;
      setLive(false);
      try {
        echo.leave(channelName);
      } catch {
        // ignore
      }
    };
  }, [enabled, qc]);

  return { live };
}
