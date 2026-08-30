import { useEffect, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ErrandDetails, ErrandListItem, Paginated } from '@/types/api';
import { getEcho } from './echo';
import { queryKeys } from './queryKeys';

type NotificationPayload = {
  id?: number;
  type?: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown> | null;
};

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
 * Subscribe to private-admin.dashboard for errand status, and private-user.{id}
 * so the header bell updates live when an in-app notification is created.
 */
export function useAdminOpsRealtime(enabled: boolean, userId = 0) {
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

    const dashboardChannel = 'admin.dashboard';
    const userChannel = userId > 0 ? `user.${userId}` : null;
    let cancelled = false;

    try {
      const dashboard = echo.private(dashboardChannel);
      setLive(false);

      dashboard.subscribed(() => {
        if (!cancelled) setLive(true);
      });
      dashboard.error(() => {
        if (!cancelled) setLive(false);
      });

      dashboard.listen('.errand.status.updated', (payload: ErrandStatusPayload) => {
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

      if (userChannel) {
        const personal = echo.private(userChannel);
        personal.listen('.notification.created', (payload: NotificationPayload) => {
          if (cancelled) return;

          void qc.invalidateQueries({ queryKey: queryKeys.inAppNotifications.all });

          const nested = payload?.data && typeof payload.data === 'object' ? payload.data : {};
          const type = String(payload?.type || nested.type || '').toLowerCase();
          if (type.includes('support_ticket')) {
            void qc.invalidateQueries({ queryKey: queryKeys.tickets.all });
          }
        });
      }
    } catch {
      setLive(false);
      return;
    }

    return () => {
      cancelled = true;
      setLive(false);
      try {
        echo.leave(dashboardChannel);
        if (userChannel) echo.leave(userChannel);
      } catch {
        // ignore
      }
    };
  }, [enabled, userId, qc]);

  return { live };
}
