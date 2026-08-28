import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/auth';
import { fetchAdminMe, getApiErrorMessage, loginAdmin, logoutAdmin } from '@/lib/adminAuthApi';
import { ADMIN_AUTH_EXPIRED_EVENT } from '@/lib/http';
import { adminDisplayName } from '@/lib/utils';
import type { AdminUser } from '@/types';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  configured: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = Boolean(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1');

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAdminToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const me = await fetchAdminMe();
        if (!cancelled) setUser(me);
      } catch {
        clearAdminToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();

    const onExpired = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, onExpired);

    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginAdmin(email, password);
      setAdminToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      clearAdminToken();
      setUser(null);
      return { error: getApiErrorMessage(err, 'Invalid admin credentials.') };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutAdmin();
    } catch {
      // Best-effort revoke; always clear local session.
    } finally {
      clearAdminToken();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const me = await fetchAdminMe();
      setUser(me);
    } catch {
      clearAdminToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured,
        displayName: adminDisplayName(user),
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
