import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, HelpCircle, LogOut, Menu, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { canAccessPage, getPagePath, hasAdminModule } from '@/lib/adminNavigation';
import { adminDisplayName, adminRoleLabel } from '@/lib/utils';
import { Admin2DateRangePicker } from './Admin2DateRangePicker';
import { personInitials } from './format';

export function Admin2TopBar({
  onOpenSidebar,
  onRequestLogout,
}: {
  onOpenSidebar: () => void;
  onRequestLogout: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = adminDisplayName(user);
  const firstName = user?.first_name?.trim() || displayName.split(' ')[0];

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-[76px] flex-shrink-0 items-center gap-[12px] border-b border-[#e2e8e3] bg-white px-[16px] sm:gap-[18px] sm:px-[28px]">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="rounded-[8px] p-2 text-[#45514a] hover:bg-[#f8faf8] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      {hasAdminModule(user, 'operations') || hasAdminModule(user, 'finance') ? (
        <>
          <div className="hidden min-w-0 flex-1 md:block">
            <GlobalSearch variant="admin2" />
          </div>
          <div className="flex-1 md:hidden" />
        </>
      ) : (
        <div className="flex-1" />
      )}

      <div className="hidden sm:block">
        <Admin2DateRangePicker />
      </div>

      <NotificationsPopover variant="admin2" />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-[9px] rounded-[8px] text-left"
        >
          <span className="flex size-[36px] items-center justify-center rounded-full bg-[#eaf6ed] text-[12px] font-bold text-[#0d5e27]">
            {personInitials(displayName)}
          </span>
          <span className="hidden flex-col gap-px leading-normal sm:flex">
            <span className="text-[12px] font-semibold text-[#17211b]">{firstName}</span>
            <span className="text-[10px] capitalize text-[#7c857f]">{adminRoleLabel(user)}</span>
          </span>
          <ChevronDown className="size-[14px]" strokeWidth={1.8} color="#7C857F" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-[200px] overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-white py-1 shadow-[0px_8px_24px_0px_rgba(16,33,23,0.12)]"
          >
            <div className="border-b border-[#e2e8e3] px-3 py-2">
              <p className="truncate text-[12px] font-semibold text-[#17211b]">{displayName}</p>
              <p className="truncate text-[10px] text-[#7c857f]">{user?.email}</p>
            </div>
            {canAccessPage(user, 'admin2-settings') ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(getPagePath('admin2-settings'));
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#17211b] hover:bg-[#f8faf8]"
              >
                <Settings className="size-[14px]" strokeWidth={1.8} />
                Settings
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                navigate(getPagePath('admin2-help'));
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#17211b] hover:bg-[#f8faf8]"
            >
              <HelpCircle className="size-[14px]" strokeWidth={1.8} />
              Help & guide
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onRequestLogout();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#b84545] hover:bg-[#fff0f0]"
            >
              <LogOut className="size-[14px]" strokeWidth={1.8} />
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
