import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import goquickWhiteLogo from '@/assets/goquick-white.png';

export function MfaChallengePage() {
  const { completeMfa, cancelMfa, mfaEmail } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: mfaError } = await completeMfa(code);
    if (mfaError) setError(mfaError);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-950 p-6 text-white mb-6">
          <img src={goquickWhiteLogo} alt="GoQuick" className="h-9 w-auto object-contain mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Two-factor check</h1>
              <p className="text-brand-100 text-sm mt-1">
                {mfaEmail ? `Signed in as ${mfaEmail}` : 'Enter your authenticator code'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          <p className="text-sm text-ink-600 mb-5">
            Open your authenticator app and enter the 6-digit code. You can also use a recovery code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Authentication code</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456 or XXXXX-XXXXX"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify and continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={cancelMfa}
              className="w-full py-2.5 text-sm font-medium text-ink-500 hover:text-ink-800"
            >
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
