import React, { useState } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { isAuthConfigured } from '../../config/apiConfig';
import { Sparkles, LogIn, AlertCircle, Globe, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  initialError?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSignIn, initialError }) => {
  const { t, language, toggleLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onSignIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.auth_access_denied);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
      }}
    >
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 tracking-tight">Porokh AI</p>
              <p className="text-xs text-slate-500">{t.app_tagline}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4"
        >
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>{t.auth_title}</span>
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">{t.auth_subtitle}</p>
          </div>

          {!isAuthConfigured && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.auth_config_missing}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="importer-email" className="block text-xs font-semibold text-slate-700">
              {t.auth_email}
            </label>
            <input
              id="importer-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="importer-password" className="block text-xs font-semibold text-slate-700">
              {t.auth_password}
            </label>
            <input
              id="importer-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isAuthConfigured}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-bold transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? t.auth_signing_in : t.auth_signin}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
