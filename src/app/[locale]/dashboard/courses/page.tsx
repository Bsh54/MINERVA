'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, FunctionSquare, Binary, Atom, Clock } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function CoursesPage() {
  const t = useTranslations('Dashboard');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        {t('backHub')}
      </Link>

      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-stem-900 font-display mb-3">Mes Cours</h1>
        <p className="text-stem-600 text-lg font-medium">Reprenez votre apprentissage là où vous l'avez laissé.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Course Card 1 */}
        <Link href="#" className="bg-white rounded-3xl p-8 border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-blue-100">
            <FunctionSquare className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-stem-900 mb-2 relative z-10">Calcul Différentiel</h3>
          <p className="text-sm text-stem-500 font-medium mb-6 flex items-center gap-2 relative z-10">
            <Clock className="w-4 h-4" /> Aujourd'hui
          </p>
          <div className="w-full bg-stem-50 rounded-full h-2.5 mb-3 overflow-hidden relative z-10">
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-right text-stem-400 font-bold uppercase tracking-wide relative z-10">
            60% complété
          </p>
        </Link>

        {/* Course Card 2 */}
        <Link href="#" className="bg-white rounded-3xl p-8 border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-accent-50 flex items-center justify-center mb-6 text-accent-500 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-accent-100">
            <Atom className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-stem-900 mb-2 relative z-10">Thermodynamique</h3>
          <p className="text-sm text-stem-500 font-medium mb-6 flex items-center gap-2 relative z-10">
            <Clock className="w-4 h-4" /> Hier
          </p>
          <div className="w-full bg-stem-50 rounded-full h-2.5 mb-3 overflow-hidden relative z-10">
            <div className="bg-gradient-to-r from-accent-400 to-accent-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <p className="text-xs text-right text-accent-500 font-bold uppercase tracking-wide relative z-10">
            Terminé 🎉
          </p>
        </Link>

        {/* Course Card 3 */}
        <Link href="#" className="bg-white rounded-3xl p-8 border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-stem-50 flex items-center justify-center mb-6 text-stem-600 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-stem-200">
            <Binary className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-stem-900 mb-2 relative z-10">Structure de Données</h3>
          <p className="text-sm text-stem-500 font-medium mb-6 flex items-center gap-2 relative z-10">
            <Clock className="w-4 h-4" /> Il y a 3 jours
          </p>
          <div className="w-full bg-stem-50 rounded-full h-2.5 mb-3 overflow-hidden relative z-10">
            <div className="bg-gradient-to-r from-stem-400 to-stem-600 h-2.5 rounded-full" style={{ width: '15%' }}></div>
          </div>
          <p className="text-xs text-right text-stem-400 font-bold uppercase tracking-wide relative z-10">
            15% complété
          </p>
        </Link>

      </div>
    </div>
  );
}
