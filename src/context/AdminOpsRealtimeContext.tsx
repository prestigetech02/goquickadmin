import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdminOpsRealtime } from '@/lib/useAdminOpsRealtime';

type AdminOpsRealtimeValue = {
  live: boolean;
};

const AdminOpsRealtimeContext = createContext<AdminOpsRealtimeValue>({ live: false });

export function AdminOpsRealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { live } = useAdminOpsRealtime(Boolean(user) && !user?.must_change_password);

  return (
    <AdminOpsRealtimeContext.Provider value={{ live }}>
      {children}
    </AdminOpsRealtimeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminOpsRealtimeStatus() {
  return useContext(AdminOpsRealtimeContext);
}
