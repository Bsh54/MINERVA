import { createClient } from '@/utils/supabase/server';
import { getTranslations } from 'next-intl/server';
import { PlusCircle, Library, UserCircle, Video } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function DashboardHub() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Hub');
  
  const firstName = user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-24 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-stem-900 font-display mb-4 tracking-tight">
          {t('greeting', { name: firstName })}
        </h1>
        <p className="text-lg text-stem-600 font-medium">
          {t('whatToDo')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">

        {/* App 1: Create */}
        <Link href="/dashboard/create" className="group flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 hover:border-accent-200 transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150"></div>

          <div className="w-20 h-20 bg-accent-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10 shadow-sm border border-accent-100">
            <PlusCircle className="w-10 h-10 text-accent-500" />
          </div>
          <h2 className="text-xl font-extrabold text-stem-900 mb-2 text-center relative z-10">{t('createTitle')}</h2>
          <p className="text-sm text-stem-500 text-center font-medium relative z-10">{t('createDesc')}</p>
        </Link>

        {/* App 2: Library */}
        <Link href="/dashboard/courses" className="group flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 hover:border-stem-300 transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-stem-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150"></div>

          <div className="w-20 h-20 bg-stem-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10 shadow-sm border border-stem-100">
            <Library className="w-10 h-10 text-stem-600" />
          </div>
          <h2 className="text-xl font-extrabold text-stem-900 mb-2 text-center relative z-10">{t('libraryTitle')}</h2>
          <p className="text-sm text-stem-500 text-center font-medium relative z-10">{t('libraryDesc')}</p>
        </Link>

        {/* App 3: AI Meeting */}
        <Link href="/dashboard/meeting" className="group flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 hover:border-purple-300 transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150"></div>

          {/* Beta badge */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-bold rounded-full z-10">
            Beta
          </div>

          <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10 shadow-sm border border-purple-100">
            <Video className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-xl font-extrabold text-stem-900 mb-2 text-center relative z-10">{t('meetingTitle')}</h2>
          <p className="text-sm text-stem-500 text-center font-medium relative z-10">{t('meetingDesc')}</p>
        </Link>

        {/* App 4: Profile */}
        <Link href="/dashboard/profile" className="group flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 hover:border-blue-300 transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150"></div>

          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10 shadow-sm border border-blue-100">
            <UserCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-extrabold text-stem-900 mb-2 text-center relative z-10">{t('profileTitle')}</h2>
          <p className="text-sm text-stem-500 text-center font-medium relative z-10">{t('profileDesc')}</p>
        </Link>

      </div>
    </div>
  );
}
