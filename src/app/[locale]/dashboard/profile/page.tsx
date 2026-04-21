'use client';

import { useTranslations } from 'next-intl';
import { signout } from '@/app/actions/auth';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function ProfilePage() {
  const t = useTranslations('Dashboard');
  const [email, setEmail] = useState<string>('...');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, [supabase.auth]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signout();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        {t('backHub')}
      </Link>

      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-4xl font-extrabold text-stem-900 font-display">{t('profile')}</h1>
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 text-red-500 font-bold border-2 border-red-100 hover:bg-red-50 px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
        >
          {isLoggingOut && <Loader2 className="w-5 h-5 animate-spin" />}
          {t('logout')}
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-soft border border-stem-100 p-8 md:p-12 flex flex-col md:flex-row gap-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="flex flex-col items-center relative z-10">
          <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-36 h-36 rounded-full border-4 border-white shadow-md mb-6" />
          <button className="text-sm font-bold text-stem-600 bg-stem-50 px-6 py-3 rounded-xl hover:bg-stem-100 transition-colors">
            Modifier la photo
          </button>
        </div>
        
        <div className="flex-1 space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-stem-900 mb-2">Nom complet</label>
              <input type="text" defaultValue="Étudiant STEM" className="w-full px-5 py-3 bg-stem-50/50 border border-stem-200 rounded-xl focus:outline-none font-medium text-stem-900" readOnly />
            </div>
            <div>
              <label className="block text-sm font-bold text-stem-900 mb-2">Email</label>
              <input type="email" value={email} className="w-full px-5 py-3 bg-stem-50/50 border border-stem-200 rounded-xl focus:outline-none font-medium text-stem-900" readOnly />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-stem-900 mb-2">{t('educationLevel')}</label>
              <select className="w-full px-5 py-3 bg-white border border-stem-200 rounded-xl focus:outline-none font-medium text-stem-900 shadow-sm" defaultValue={t('highSchoolSenior')}>
                <option>{t('highSchoolSenior')}</option>
                <option>{t('universityFirstYear')}</option>
                <option>{t('scientificPrep')}</option>
              </select>
            </div>
          </div>
          
          <div className="pt-8 border-t border-stem-100">
            <h3 className="font-extrabold text-xl text-stem-900 mb-6">{t('currentSubscription')}</h3>
            <div className="bg-gradient-to-br from-stem-800 to-stem-900 rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-float">
              <div>
                <p className="font-display font-bold text-2xl mb-1">{t('freePlan')}</p>
                <p className="text-stem-200 font-medium">{t('courseGenerationsPerMonth', { count: 3 })}</p>
              </div>
              <button className="btn-3d w-full md:w-auto bg-accent-500 hover:bg-orange-500 text-white font-extrabold px-8 py-4 rounded-xl shadow-button flex justify-center items-center">
                {t('upgradeToPro')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
