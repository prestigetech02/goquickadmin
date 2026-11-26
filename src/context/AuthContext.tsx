import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  clearAdminToken,
  clearMfaChallengeToken,
  getAdminToken,
  getMfaChallengeToken,
  setAdminToken,
  setMfaChallengeToken,
} from '@/lib/auth';
import {
  fetchAdminMe,
  getApiErrorMessage,
  loginAdmin,
  logoutAdmin,
  verifyAdminMfa,
} from '@/lib/adminAuthApi';
import { disconnectEcho } from '@/lib/echo';
import { ADMIN_AUTH_EXPIRED_EVENT } from '@/lib/http';
import { adminDisplayName } from '@/lib/utils';
import type { AdminUser } from '@/types';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  configured: boolean;
  displayName: string;
  mfaPending: boolean;
  mfaEmail: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; mfaRequired?: boolean }>;
  completeMfa: (code: string) => Promise<{ error: string | null }>;
  cancelMfa: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);
  const configured = Boolean(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1');

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (getMfaChallengeToken()) {
        if (!cancelled) {
          setMfaPending(true);
          setUser(null);
          setLoading(false);
        }
        return;
      }

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
        disconnectEcho();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();

    const onExpired = () => {
      disconnectEcho();
      clearMfaChallengeToken();
      setMfaPending(false);
      setMfaEmail(null);
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
      if (data.mfa_required && data.challenge_token) {
        clearAdminToken();
        setMfaChallengeToken(data.challenge_token);
        setMfaPending(true);
        setMfaEmail(data.user.email ?? email.trim());
        setUser(null);
        return { error: null, mfaRequired: true };
      }

      if (!data.token) {
        return { error: 'Login failed.' };
      }

      clearMfaChallengeToken();
      setMfaPending(false);
      setMfaEmail(null);
      setAdminToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      clearAdminToken();
      clearMfaChallengeToken();
      disconnectEcho();
      setMfaPending(false);
      setMfaEmail(null);
      setUser(null);
      return { error: getApiErrorMessage(err, 'Invalid admin credentials.') };
    }
  }, []);

  const completeMfa = useCallback(async (code: string) => {
    const challenge = getMfaChallengeToken();
    if (!challenge) {
      setMfaPending(false);
      return { error: 'Two-factor session expired. Sign in again.' };
    }

    try {
      const data = await verifyAdminMfa(challenge, code);
      if (!data.token) {
        return { error: 'Could not complete two-factor sign-in.' };
      }
      clearMfaChallengeToken();
      setMfaPending(false);
      setMfaEmail(null);
      setAdminToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: getApiErrorMessage(err, 'Invalid authenticator or recovery code.') };
    }
  }, []);

  const cancelMfa = useCallback(() => {
    clearMfaChallengeToken();
    clearAdminToken();
    disconnectEcho();
    setMfaPending(false);
    setMfaEmail(null);
    setUser(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutAdmin();
    } catch {
      // Best-effort revoke; always clear local session.
    } finally {
      clearAdminToken();
      clearMfaChallengeToken();
      disconnectEcho();
      setMfaPending(false);
      setMfaEmail(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      disconnectEcho();
      setUser(null);
      return;
    }

    try {
      const me = await fetchAdminMe();
      setUser(me);
    } catch {
      clearAdminToken();
      disconnectEcho();
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
        mfaPending,
        mfaEmail,
        signIn,
        completeMfa,
        cancelMfa,
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
