import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { markInAppNotificationRead } from '@/api/adminInAppNotificationsApi';
import { notificationIcon } from '@/components/notificationIcon';
import { useAuth } from '@/context/AuthContext';
import { subscribeLiveNotifications } from '@/lib/liveNotifications';
import { notificationHref } from '@/lib/notificationTarget';
import { queryKeys } from '@/lib/queryKeys';
import { titleCase } from '@/lib/utils';
import type { AppNotification } from '@/types/inAppNotification';

const MAX_VISIBLE = 3;
const VISIBLE_MS = 7000;

export function LiveAlertToasts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const markRead = useMutation({
    mutationFn: markInAppNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inAppNotifications.all }),
  });

  const dismiss = (id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  useEffect(() => {
    const pending = timers.current;
    const unsubscribe = subscribeLiveNotifications((notification) => {
      setAlerts((current) =>
        current.some((alert) => alert.id === notification.id)
          ? current
          : [notification, ...current].slice(0, MAX_VISIBLE),
      );
      pending.set(
        notification.id,
        setTimeout(() => {
          pending.delete(notification.id);
          setAlerts((current) => current.filter((alert) => alert.id !== notification.id));
        }, VISIBLE_MS),
      );
    });
    return () => {
      unsubscribe();
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[20px] right-[20px] z-50 flex w-[min(340px,calc(100vw-40px))] flex-col gap-[10px]" aria-live="polite">
      {alerts.map((alert) => {
        const Icon = notificationIcon(alert.type);
        return (
          <div
            key={alert.id}
            className="pointer-events-auto flex items-start gap-[10px] rounded-[10px] border border-[#e2e8e3] bg-white p-[12px] shadow-[0px_8px_24px_0px_rgba(16,33,23,0.14)] animate-scale-in"
          >
            <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-full bg-[#eaf6ed] text-[#167d35]">
              <Icon className="size-[16px]" strokeWidth={1.8} />
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                markRead.mutate(alert.id);
                dismiss(alert.id);
                navigate(notificationHref(alert, user, 'admin2-inbox'));
              }}
            >
              <p className="truncate text-[12px] font-semibold text-[#17211b]">
                {alert.title || titleCase(alert.type.replace(/_/g, ' '))}
              </p>
              <p className="mt-[2px] line-clamp-2 text-[11px] text-[#45514a]">{alert.message}</p>
            </button>
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className="rounded-[6px] p-1 text-[#7c857f] hover:bg-[#f1f5f2]"
              aria-label="Dismiss"
            >
              <X className="size-[14px]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
