import { useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPageHref, type PageKey } from '@/lib/adminNavigation';

export type AdminNavigateOptions = {
  openId?: number;
};

export function AdminNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (page: PageKey, options?: AdminNavigateOptions) => {
      navigate(getPageHref(page, options));
    },
    [navigate],
  );
}
