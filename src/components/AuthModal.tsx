import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { api, setStoredToken } from '../api';

interface AuthModalProps {
  isInitialized: boolean;
  defaultUsername?: string;
  onSuccess: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isInitialized, defaultUsername, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'setup'>(isInitialized ? 'login' : 'setup');
  const [username, setUsername] = useState(defaultUsername || (isInitialized ? 'virat' : ''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(isInitialized ? 'login' : 'setup');
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [isInitialized, defaultUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Username is required.');
      return;
    }
    if (!cleanPass) {
      setError('Password is required.');
      return;
    }

    if (mode === 'setup') {
      if (cleanPass.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (cleanPass !== confirmPassword.trim()) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'setup') {
        const res = await api.setupAdmin(cleanUser, cleanPass);
        setStoredToken(res.token);
        onSuccess(cleanUser);
      } else {
        const res = await api.loginAdmin(cleanUser, cleanPass);
        setStoredToken(res.token);
        onSuccess(cleanUser);
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      if (msg.toLowerCase().includes('already configured') || msg.toLowerCase().includes('already initialized')) {
        // Automatically switch to login mode and pre-fill username
        setMode('login');
        setError('Administrator is already configured. Please enter your master password to unlock.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/10">
            {mode === 'login' ? <Lock className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Administrator Access' : 'Initial Security Setup'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {mode === 'login'
              ? 'Karnataka RTO Document & Paperwork Management System'
              : 'Configure your single-user master administrator credentials'}
          </p>
        </div>

        {/* Security Notice */}
        <div className="mb-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300">
          <KeyRound className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            {mode === 'login'
              ? 'Private single-owner system. Protected by secure session tokens and lockout limits.'
              : 'Set your master administrator username and secure password (minimum 8 characters).'}
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Admin Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder="Enter username (e.g. virat)"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder={mode === 'login' ? 'Enter master password' : 'Min 8 characters'}
              />
            </div>
          </div>

          {mode === 'setup' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Master Password
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="Repeat master password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <Lock className="w-4 h-4" />
                Unlock Dashboard
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Save & Initialize System
              </>
            )}
          </button>
        </form>

        {/* Mode switcher link */}
        <div className="mt-5 text-center">
          {mode === 'setup' ? (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Already set up? Log in with master credentials <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('setup');
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-400 font-medium cursor-pointer"
            >
              Configure or re-initialize administrator
            </button>
          )}
        </div>

        <div className="mt-6 text-center border-t border-slate-800 pt-3">
          <p className="text-[11px] text-slate-500">
            Karnataka RTO Agent & Showroom Paperwork Tracking • Private Deployment
          </p>
        </div>
      </div>
    </div>
  );
};
