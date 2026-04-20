'use client';

import { useTranslations } from 'next-intl';
import { BrainCircuit, LayoutDashboard, BookOpen, BarChart2 } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';

export function Sidebar({ userEmail }: { userEmail: string }) {
  const t = useTranslations('Dashboard');
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stem-600 rounded-lg flex items-center justify-center text-white">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl text-stem-900">Evolutics</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive('/dashboard') ? 'bg-stem-50 text-stem-600' : 'text-gray-600 hover:bg-gray-50'}`}>
          <LayoutDashboard className="w-5 h-5" /> {t('home')}
        </Link>
        <Link href="/dashboard/courses" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive('/dashboard/courses') ? 'bg-stem-50 text-stem-600' : 'text-gray-600 hover:bg-gray-50'}`}>
          <BookOpen className="w-5 h-5" /> {t('myCourses')}
        </Link>
        <Link href="/dashboard/stats" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive('/dashboard/stats') ? 'bg-stem-50 text-stem-600' : 'text-gray-600 hover:bg-gray-50'}`}>
          <BarChart2 className="w-5 h-5" /> {t('stats')}
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Link href="/dashboard/profile" className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors truncate">
          <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0" />
          <div className="truncate">
            <p className="text-sm font-bold text-gray-900 truncate" title={userEmail}>{userEmail}</p>
            <p className="text-xs text-gray-500">{t('profile')}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
