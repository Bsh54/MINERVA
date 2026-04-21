import { useTranslations, useLocale } from 'next-intl';
import {
  BrainCircuit,
  Sparkles,
  ArrowRight,
  Globe,
  ChevronDown,
  LayoutTemplate,
  Target,
  Network,
  UploadCloud,
  Cpu,
  CheckCircle2,
  Check
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import React from 'react';

export default function LandingPage() {
  const t = useTranslations('Index');
  const locale = useLocale();

  return (
    <div className="min-h-screen flex flex-col bg-stem-50 overflow-x-hidden selection:bg-stem-200 selection:text-stem-900">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stem-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-stem-400 to-stem-600 rounded-xl flex items-center justify-center text-white shadow-soft">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <span className="font-display font-bold text-2xl text-stem-900">
                Evolutics<span className="text-accent-500">Learn</span>
              </span>
            </Link>

            <div className="hidden md:flex gap-8 items-center">
               <a href="#features" className="text-sm font-medium text-stem-600 hover:text-stem-900 transition-colors">{t('nav.features')}</a>
               <a href="#how" className="text-sm font-medium text-stem-600 hover:text-stem-900 transition-colors">{t('nav.howItWorks')}</a>
               <a href="#pricing" className="text-sm font-medium text-stem-600 hover:text-stem-900 transition-colors">{t('nav.pricing')}</a>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative group hidden sm:block">
                <button className="flex items-center gap-1.5 text-sm font-bold text-stem-600 hover:text-stem-900 px-3 py-2 rounded-lg hover:bg-stem-100 transition-colors">
                  <Globe className="w-4 h-4" />
                  <span className="uppercase">{locale}</span>
                  <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-float border border-stem-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-top-right transform scale-95 group-hover:scale-100">
                  <div className="p-1">
                    <Link href="/en" className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${locale === 'en' ? 'bg-stem-50 text-stem-900' : 'text-stem-600 hover:bg-stem-50 hover:text-stem-900'}`}>English</Link>
                    <Link href="/fr" className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${locale === 'fr' ? 'bg-stem-50 text-stem-900' : 'text-stem-600 hover:bg-stem-50 hover:text-stem-900'}`}>Français</Link>
                  </div>
                </div>
              </div>

              <div className="h-6 w-px bg-stem-200 hidden sm:block"></div>

              <Link href="/auth/login" className="hidden sm:block font-medium text-sm text-stem-600 hover:text-stem-900 transition-colors">
                {t('signIn')}
              </Link>
              <Link href="/auth/register" className="btn-3d bg-accent-500 hover:bg-orange-500 text-white font-bold py-2 px-4 md:px-6 rounded-xl shadow-button text-sm">
                {t('signUp')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">

        {/* HERO SECTION */}
        <section className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="absolute top-10 left-1/4 w-32 h-32 bg-accent-500/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-stem-400/20 rounded-full blur-3xl -z-10"></div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stem-100 text-stem-600 font-medium mb-6 border border-stem-200 shadow-sm">
            <Sparkles className="w-4 h-4 text-accent-500" />
            <span>AI powered learning platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-stem-900 mb-6 leading-tight max-w-4xl mx-auto font-display">
            {t.rich('title', {
              highlight: (chunks) => <span className="text-transparent bg-clip-text bg-gradient-to-r from-stem-600 to-accent-500 block sm:inline">{chunks}</span>
            })}
          </h1>

          <p className="text-xl text-stem-600 mb-10 max-w-2xl mx-auto">
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="btn-3d bg-stem-600 hover:bg-stem-800 text-white font-bold py-4 px-8 rounded-2xl shadow-button-teal text-lg flex items-center justify-center gap-2 w-full sm:w-auto">
              {t('cta')} <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how" className="py-4 px-8 rounded-2xl font-bold text-stem-600 hover:bg-stem-100 transition-colors w-full sm:w-auto">
              {t('nav.howItWorks')}
            </a>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="bg-white py-24 border-t border-stem-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xl font-bold text-accent-500 tracking-widest uppercase mb-2">{t('features.tag')}</h2>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-stem-900 mb-4">{t('features.title')}</h3>
              <p className="text-lg text-stem-600">{t('features.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-stem-50 border border-stem-100 hover:shadow-soft transition-all group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 text-stem-600 group-hover:scale-110 transition-transform">
                  <LayoutTemplate className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-stem-900 mb-3">{t('features.feat1')}</h4>
                <p className="text-stem-600 leading-relaxed">{t('features.feat1Desc')}</p>
              </div>

              <div className="p-8 rounded-3xl bg-orange-50 border border-orange-100 hover:shadow-soft transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 text-accent-500 group-hover:scale-110 transition-transform relative z-10">
                  <Target className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-stem-900 mb-3 relative z-10">{t('features.feat2')}</h4>
                <p className="text-stem-600 leading-relaxed relative z-10">{t('features.feat2Desc')}</p>
              </div>

              <div className="p-8 rounded-3xl bg-stem-50 border border-stem-100 hover:shadow-soft transition-all group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 text-stem-600 group-hover:scale-110 transition-transform">
                  <Network className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-stem-900 mb-3">{t('features.feat3')}</h4>
                <p className="text-stem-600 leading-relaxed">{t('features.feat3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how" className="py-24 bg-stem-900 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-stem-800 rounded-full blur-3xl opacity-50"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xl font-bold text-stem-400 tracking-widest uppercase mb-2">{t('how.tag')}</h2>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">{t('how.title')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-stem-700"></div>

              <div className="relative text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-stem-800 border-4 border-stem-900 rounded-full flex items-center justify-center mb-6 relative z-10">
                  <UploadCloud className="w-10 h-10 text-stem-400" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-500 rounded-full border-4 border-stem-900 flex items-center justify-center font-bold text-sm">1</div>
                </div>
                <h4 className="text-xl font-bold mb-2">{t('how.step1')}</h4>
                <p className="text-stem-200">{t('how.step1Desc')}</p>
              </div>

              <div className="relative text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-stem-800 border-4 border-stem-900 rounded-full flex items-center justify-center mb-6 relative z-10">
                  <Cpu className="w-10 h-10 text-accent-500" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-stem-400 rounded-full border-4 border-stem-900 flex items-center justify-center font-bold text-sm text-stem-900">2</div>
                </div>
                <h4 className="text-xl font-bold mb-2">{t('how.step2')}</h4>
                <p className="text-stem-200">{t('how.step2Desc')}</p>
              </div>

              <div className="relative text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-stem-800 border-4 border-stem-900 rounded-full flex items-center justify-center mb-6 relative z-10">
                  <CheckCircle2 className="w-10 h-10 text-stem-400" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-500 rounded-full border-4 border-stem-900 flex items-center justify-center font-bold text-sm">3</div>
                </div>
                <h4 className="text-xl font-bold mb-2">{t('how.step3')}</h4>
                <p className="text-stem-200">{t('how.step3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xl font-bold text-accent-500 tracking-widest uppercase mb-2">{t('pricing.tag')}</h2>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-stem-900 mb-4">{t('pricing.title')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-stem-50 border border-stem-100 flex flex-col">
                <h4 className="text-2xl font-bold text-stem-900 mb-2">{t('pricing.free')}</h4>
                <p className="text-stem-600 mb-6">{t('pricing.freeDesc')}</p>
                <div className="mb-8">
                  <span className="text-5xl font-display font-bold text-stem-900">$0</span>
                  <span className="text-stem-600 font-medium">{t('pricing.month')}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-stem-700 font-medium"><Check className="w-5 h-5 text-stem-500" /> 3 AI generations per month</li>
                  <li className="flex items-center gap-3 text-stem-700 font-medium"><Check className="w-5 h-5 text-stem-500" /> Basic Quizzes</li>
                  <li className="flex items-center gap-3 text-stem-700 font-medium"><Check className="w-5 h-5 text-stem-500" /> Standard Support</li>
                </ul>
                <Link href="/auth/register" className="block text-center py-4 rounded-xl font-bold text-stem-600 bg-white border border-stem-200 hover:bg-stem-100 transition-colors">
                  {t('pricing.startFree')}
                </Link>
              </div>

              <div className="p-8 rounded-3xl bg-stem-900 border border-stem-800 text-white flex flex-col relative overflow-hidden shadow-float">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h4 className="text-2xl font-bold text-white mb-2 relative z-10">{t('pricing.pro')}</h4>
                <p className="text-stem-200 mb-6 relative z-10">{t('pricing.proDesc')}</p>
                <div className="mb-8 relative z-10">
                  <span className="text-5xl font-display font-bold text-white">$12</span>
                  <span className="text-stem-300 font-medium">{t('pricing.month')}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1 relative z-10">
                  <li className="flex items-center gap-3 text-stem-100 font-medium"><Check className="w-5 h-5 text-accent-500" /> Unlimited AI generations</li>
                  <li className="flex items-center gap-3 text-stem-100 font-medium"><Check className="w-5 h-5 text-accent-500" /> Adaptive Learning Loop</li>
                  <li className="flex items-center gap-3 text-stem-100 font-medium"><Check className="w-5 h-5 text-accent-500" /> Auto Mind Maps</li>
                  <li className="flex items-center gap-3 text-stem-100 font-medium"><Check className="w-5 h-5 text-accent-500" /> Priority Support</li>
                </ul>
                <Link href="/auth/register" className="btn-3d block text-center py-4 rounded-xl font-bold text-white bg-accent-500 hover:bg-orange-500 shadow-button relative z-10">
                  {t('pricing.upgradePro')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-stem-50 border-t border-stem-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-stem-600" />
            <span className="font-display font-bold text-xl text-stem-900">
              Evolutics<span className="text-accent-500">Learn</span>
            </span>
          </div>
          <p className="text-stem-600 font-medium text-sm text-center md:text-left">
            {t('footer.rights')}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm font-medium text-stem-600 hover:text-stem-900 transition-colors">{t('footer.terms')}</a>
            <a href="#" className="text-sm font-medium text-stem-600 hover:text-stem-900 transition-colors">{t('footer.privacy')}</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
