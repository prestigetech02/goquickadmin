import { useEffect, useState } from 'react';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import type Pusher from 'pusher-js';
import type { ErrandDetails, ErrandListItem, Paginated } from '@/types/api';
import { parseNotification, type RawAppNotification } from '@/types/inAppNotification';
import { getEcho } from './echo';
import { publishLiveNotification } from './liveNotifications';
import { queryKeys } from './queryKeys';

type ErrandStatusPayload = {
  errand_id?: number;
  status?: string;
  updated_at?: string;
};

type BoardUpdatedPayload = {
  modules?: string[];
};

const DASHBOARD: QueryKey = ['admin-dashboard'];
const BADGES: QueryKey = queryKeys.dashboard.badges;
const PAYMENTS: QueryKey = ['admin-payments'];

/** Query prefixes each backend module signal refreshes. Only mounted queries refetch. */
const MODULE_QUERIES: Record<string, QueryKey[]> = {
  errands: [
    queryKeys.errands.all,
    DASHBOARD,
    ['admin-users', 'errands'],
    ['admin-users', 'profile'],
    ['admin-runners', 'profile'],
    ['admin-runners', 'board-overview'],
    ['admin-runners', 'directory'],
  ],
  users: [queryKeys.users.all, DASHBOARD],
  runners: [queryKeys.runners.all, DASHBOARD],
  verifications: [queryKeys.runners.all, BADGES],
  withdrawals: [PAYMENTS, BADGES, ['admin-runners', 'payouts'], ['admin-users', 'wallet']],
  transactions: [PAYMENTS, DASHBOARD, ['admin-users', 'wallet'], ['admin-runners', 'earnings']],
  disputes: [queryKeys.disputes.all, DASHBOARD],
  tickets: [queryKeys.tickets.all, BADGES],
  coupons: [queryKeys.coupons.all],
  campaigns: [['admin-notifications']],
};

const BOARD_REFRESH_DELAY_MS = 1000;

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
 * Subscribes to private-admin.dashboard for board changes and errand status, and to
 * private-user.{id} so the bell and live alerts update the moment a notification lands.
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
    const connection = (echo.connector as { pusher?: Pusher }).pusher?.connection;
    let cancelled = false;
    let subscribed = false;
    let droppedSinceConnect = false;
    const pendingModules = new Set<string>();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const syncLive = () => {
      if (!cancelled) setLive(subscribed && (connection ? connection.state === 'connected' : true));
    };

    const flushModules = () => {
      refreshTimer = null;
      const seen = new Set<string>();
      pendingModules.forEach((module) => {
        (MODULE_QUERIES[module] ?? []).forEach((queryKey) => {
          const id = JSON.stringify(queryKey);
          if (seen.has(id)) return;
          seen.add(id);
          void qc.invalidateQueries({ queryKey });
        });
      });
      pendingModules.clear();
    };

    const queueModules = (modules: string[]) => {
      modules.forEach((module) => pendingModules.add(module));
      if (refreshTimer == null) refreshTimer = setTimeout(flushModules, BOARD_REFRESH_DELAY_MS);
    };

    const onStateChange = ({ current }: { previous: string; current: string }) => {
      if (cancelled) return;
      if (current === 'connected' && droppedSinceConnect) {
        droppedSinceConnect = false;
        // Events sent while offline are lost, so catch up every screen that is open.
        void qc.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'admin-auth' });
      } else if (current === 'unavailable' || current === 'disconnected' || current === 'failed') {
        droppedSinceConnect = true;
      }
      syncLive();
    };

    try {
      connection?.bind('state_change', onStateChange);

      const dashboard = echo.private(dashboardChannel);
      setLive(false);

      dashboard.subscribed(() => {
        subscribed = true;
        syncLive();
      });
      dashboard.error(() => {
        subscribed = false;
        syncLive();
      });

      dashboard.listen('.admin.board.updated', (payload: BoardUpdatedPayload) => {
        if (cancelled || !Array.isArray(payload?.modules)) return;
        queueModules(payload.modules.map(String));
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
        queueModules(['errands']);
      });

      if (userChannel) {
        const personal = echo.private(userChannel);
        personal.listen('.notification.created', (payload: RawAppNotification) => {
          if (cancelled) return;

          void qc.invalidateQueries({ queryKey: queryKeys.inAppNotifications.all });

          const notification = parseNotification(payload ?? { id: 0 });
          if (notification.type.includes('support_ticket')) {
            void qc.invalidateQueries({ queryKey: queryKeys.tickets.all });
          }
          if (notification.id > 0) publishLiveNotification(notification);
        });
      }
    } catch {
      setLive(false);
      return;
    }

    return () => {
      cancelled = true;
      if (refreshTimer != null) clearTimeout(refreshTimer);
      setLive(false);
      try {
        connection?.unbind('state_change', onStateChange);
        echo.leave(dashboardChannel);
        if (userChannel) echo.leave(userChannel);
      } catch {
        // ignore
      }
    };
  }, [enabled, userId, qc]);

  return { live };
}
