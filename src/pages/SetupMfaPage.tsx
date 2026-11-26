import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/context/AuthContext';
import { confirmAdminMfa, getApiErrorMessage, setupAdminMfa } from '@/lib/adminAuthApi';
import goquickWhiteLogo from '@/assets/goquick-white.png';

type Step = 'loading' | 'scan' | 'recovery' | 'error';

export function SetupMfaPage() {
  const { user, refreshUser, signOut } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const setup = await setupAdminMfa();
        if (cancelled) return;
        setSecret(setup.secret);
        setOtpauthUrl(setup.otpauth_url);
        try {
          const dataUrl = await QRCode.toDataURL(setup.otpauth_url, {
            width: 220,
            margin: 2,
            color: { dark: '#111612', light: '#ffffff' },
          });
          if (!cancelled) setQrDataUrl(dataUrl);
        } catch {
          if (!cancelled) setQrDataUrl(null);
        }
        setStep('scan');
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not start two-factor setup.'));
          setStep('error');
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await confirmAdminMfa(code);
      setRecoveryCodes(result.recovery_codes);
      setStep('recovery');
      // Delay session refresh until they acknowledge recovery codes,
      // otherwise the app gate leaves this screen immediately.
    } catch (err) {
      setError(getApiErrorMessage(err, 'That code is invalid or expired.'));
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const copyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-950 p-6 text-white mb-6">
          <img src={goquickWhiteLogo} alt="GoQuick" className="h-9 w-auto object-contain mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Set up two-factor authentication</h1>
              <p className="text-brand-100 text-sm mt-1">
                {user?.email ? `Required for ${user.email}` : 'Required for all admin accounts'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-ink-500">Preparing authenticator setup…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full py-3 rounded-xl border border-ink-200 text-ink-700 font-semibold hover:bg-ink-50"
              >
                Sign out and try again
              </button>
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-5">
              <p className="text-sm text-ink-600">
                Scan this QR code with Google Authenticator, Authy, 1Password, or any TOTP app. Then enter the
                6-digit code to confirm.
              </p>

              <div className="flex flex-col items-center gap-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Authenticator QR code"
                    className="w-[220px] h-[220px] rounded-xl border border-ink-100"
                  />
                ) : (
                  <div className="w-full rounded-xl bg-ink-50 border border-ink-100 p-4 text-sm text-ink-600 break-all">
                    {otpauthUrl}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-ink-500 mb-1.5">Or enter this key manually</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-ink-50 border border-ink-100 rounded-xl px-3 py-2.5 break-all">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copySecret()}
                    className="p-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50"
                    aria-label="Copy secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && <p className="text-xs text-brand-600 mt-1">Copied</p>}
              </div>

              <form onSubmit={handleConfirm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">6-digit code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500 tracking-widest"
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
                  disabled={busy || code.trim().length < 6}
                  className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirm and continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'recovery' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl bg-brand-50 border border-brand-100 p-4">
                <CheckCircle2 className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">Two-factor is on</p>
                  <p className="text-sm text-ink-600 mt-1">
                    Save these recovery codes somewhere safe. Each code works once if you lose your authenticator.
                  </p>
                </div>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recoveryCodes.map((item) => (
                  <li
                    key={item}
                    className="font-mono text-sm bg-ink-50 border border-ink-100 rounded-xl px-3 py-2 text-center"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void copyRecovery()}
                className="w-full py-2.5 rounded-xl border border-ink-200 text-ink-700 font-medium hover:bg-ink-50 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied' : 'Copy recovery codes'}
              </button>

              <button
                type="button"
                onClick={() => {
                  void refreshUser();
                }}
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 flex items-center justify-center gap-2"
              >
                I saved my codes — continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
