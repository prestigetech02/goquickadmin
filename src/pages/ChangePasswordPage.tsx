import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { changeAdminPassword } from '@/lib/adminAuthApi';
import goquickWhiteLogo from '@/assets/goquick-white.png';

export function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('New password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      await changeAdminPassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-950 p-6 text-white mb-6">
          <img src={goquickWhiteLogo} alt="GoQuick" className="h-9 w-auto object-contain mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Change your password</h1>
              <p className="text-brand-100 text-sm mt-1">
                {user?.email ? `Signed in as ${user.email}` : 'Security check required before continuing'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          <p className="text-sm text-ink-600 mb-5">
            Your account was created with a temporary password. Choose a new password to access the admin panel.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Current password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Update password
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
