import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Admin2DateRangeProvider } from '@/context/Admin2DateRangeContext';
import { Modal } from '@/components/ui/Modal';
import { Admin2Sidebar } from './Admin2Sidebar';
import { Admin2TopBar } from './Admin2TopBar';

export function Admin2Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setShowLogoutConfirm(false);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Admin2DateRangeProvider>
      <div className="flex min-h-screen bg-[#f5f7f4] font-inter text-[#17211b]">
        {sidebarOpen ? (
          <div className="fixed inset-0 z-30 bg-[#17211b]/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        ) : null}

        <Admin2Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onRequestLogout={() => setShowLogoutConfirm(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Admin2TopBar
            onOpenSidebar={() => setSidebarOpen(true)}
            onRequestLogout={() => setShowLogoutConfirm(true)}
          />
          <main className="flex-1 px-[16px] pb-[32px] pt-[26px] sm:px-[28px]">{children}</main>
        </div>
      </div>

      <Modal open={showLogoutConfirm} onClose={() => !loggingOut && setShowLogoutConfirm(false)} title="Log out?" size="sm">
        <p className="mb-6 text-sm text-ink-600">
          You will be signed out of the admin panel. You can sign back in with your email and password.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(false)}
            disabled={loggingOut}
            className="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmLogout()}
            disabled={loggingOut}
            className="flex-1 rounded-xl bg-error-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-error-700 disabled:opacity-60"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </Modal>
    </Admin2DateRangeProvider>
  );
}
