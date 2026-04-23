'use client';

import { BrainCircuit } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export function Topbar() {
  const tCommon = useTranslations('Common');

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
      <Link href="/dashboard" className="w-8 h-8 bg-stem-600 rounded-lg flex items-center justify-center text-white">
        <BrainCircuit className="w-5 h-5" />
      </Link>
      <Link href="/dashboard/profile">
        <img src="https://i.pravatar.cc/150?img=11" alt={tCommon('userAlt')} className="w-8 h-8 rounded-full" />
      </Link>
    </header>
  );
}
