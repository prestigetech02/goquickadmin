import type { AppNotification } from '@/types/inAppNotification';

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();

/** Fan-out for notifications pushed over the socket, so the bell and toasts react without refetch timing. */
export function subscribeLiveNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishLiveNotification(notification: AppNotification): void {
  listeners.forEach((listener) => listener(notification));
}
