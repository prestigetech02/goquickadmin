import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Package, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import goquickWhiteLogo from '@/assets/goquick-white.png';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) setError(signInError);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 600 600" fill="none">
            <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="2" />
            <circle cx="400" cy="400" r="200" stroke="white" strokeWidth="2" />
            <circle cx="300" cy="300" r="250" stroke="white" strokeWidth="2" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img
              src={goquickWhiteLogo}
              alt="GoQuick"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Manage your logistics empire from one dashboard
            </h1>
            <p className="mt-4 text-brand-100 text-lg max-w-md">
              Track errands, manage runners, process payments, and grow your delivery business — all in real time.
            </p>
            <div className="mt-8 flex gap-6">
              <div>
                <p className="text-3xl font-bold">10K+</p>
                <p className="text-brand-200 text-sm">Errands delivered</p>
              </div>
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="text-brand-200 text-sm">Active runners</p>
              </div>
              <div>
                <p className="text-3xl font-bold">99.9%</p>
                <p className="text-brand-200 text-sm">Uptime</p>
              </div>
            </div>
          </div>
          <p className="text-brand-200 text-sm">© {new Date().getFullYear()} GoQuick. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-ink-900">GoQuick Admin</span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900">Welcome back</h2>
          <p className="text-ink-500 mt-1">Sign in to your admin dashboard</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@goquickapp.com.ng"
                  autoComplete="username"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-ink-200 bg-white text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
