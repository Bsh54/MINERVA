import { useTranslations } from 'next-intl';
import { BrainCircuit, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Auth');

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side (Branding) - Strict 50% */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-stem-900 to-stem-800 p-8 lg:p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background blobs for depth */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-stem-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2 cursor-pointer w-fit">
          <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-soft">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">
            Evolutics<span className="text-accent-500">Learn</span>
          </span>
        </Link>

        {/* Image centrale */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-md">
            <img
              src="/auth-illustration.svg"
              alt="Learning illustration"
              className="w-full h-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Right Side (Form Area) - Strict 50% & Centered */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center relative overflow-y-auto">
        
        {/* Close button for Mobile (Return to home) */}
        <div className="absolute top-4 right-4 md:hidden">
          <Link href="/" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </Link>
        </div>

        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute top-4 left-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stem-600 rounded-lg flex items-center justify-center text-white shadow-soft">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg text-stem-900">Evolutics</span>
          </Link>
        </div>

        {/* The Form Content - Reduced max width and padding */}
        <div className="w-full max-w-sm mx-auto px-6 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    </svg>
  );
}
