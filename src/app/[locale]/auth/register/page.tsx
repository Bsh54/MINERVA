'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { signup } from '@/app/actions/auth';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

export default function RegisterPage() {
  const t = useTranslations('Auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();

  // Validation du mot de passe
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  const canSubmit = isPasswordValid && passwordsMatch;

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h3 className="text-3xl font-extrabold text-stem-900 mb-2 font-display tracking-tight">{t('createAccount')}</h3>
        <p className="text-stem-600 text-sm">{t('subtitleRegister')}</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4 flex flex-col">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-stem-900 mb-1">{t('emailLabel')}</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2.5 bg-stem-50/50 border border-stem-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 focus:border-stem-400 outline-none transition-all placeholder:text-stem-300 text-sm font-medium text-stem-900"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stem-900 mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 bg-stem-50/50 border border-stem-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 focus:border-stem-400 outline-none transition-all placeholder:text-stem-300 text-sm font-medium text-stem-900"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stem-400 hover:text-stem-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stem-900 mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 bg-stem-50/50 border rounded-xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 outline-none transition-all placeholder:text-stem-300 text-sm font-medium text-stem-900 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-red-500 focus:border-red-500'
                    : 'border-stem-200 focus:border-stem-400'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stem-400 hover:text-stem-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <X className="w-3 h-3" />
                Les mots de passe ne correspondent pas
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Les mots de passe correspondent
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="w-full btn-3d bg-stem-600 hover:bg-stem-800 disabled:bg-stem-300 disabled:cursor-not-allowed text-white font-extrabold py-3 px-4 rounded-xl shadow-button-teal mt-4 flex items-center justify-center gap-2 text-base"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          S'inscrire
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-stem-100"></div>
          <span className="px-3 text-xs font-medium text-stem-400 uppercase tracking-widest">{t('orContinue')}</span>
          <div className="flex-grow border-t border-stem-100"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border-2 border-stem-100 rounded-xl text-stem-900 text-sm font-bold hover:bg-stem-50 hover:border-stem-200 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('continueGoogle')}
        </button>
      </form>

      <div className="mt-6 text-center bg-stem-50 p-4 rounded-xl border border-stem-200">
        <Link href="/auth/login" className="text-sm font-bold text-stem-700 hover:text-stem-900 transition-colors">
          {t('haveAccount')}
        </Link>
      </div>
    </>
  );
}
