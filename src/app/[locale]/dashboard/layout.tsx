import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { BrainCircuit } from 'lucide-react';
import { Link } from '@/i18n/routing';
import React from 'react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal Top Nav */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stem-600 rounded-lg flex items-center justify-center text-white shadow-soft">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl text-stem-900">
            MINERVA
          </span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
