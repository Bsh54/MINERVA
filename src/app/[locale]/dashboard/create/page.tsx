'use client';

import { useTranslations } from 'next-intl';
import { Upload, Loader2, Play, ChevronLeft, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useState } from 'react';

interface Module {
  id: number;
  title: string;
  description: string;
  estimatedMinutes: number;
}

interface CoursePlan {
  courseTitle: string;
  summary: string;
  modules: Module[];
}

export default function CreateCoursePage() {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('CreateCourse');
  const [uploadState, setUploadState] = useState<'idle' | 'loading' | 'result' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const startGeneration = async () => {
    if (!textInput.trim() || textInput.length < 20) {
      setErrorMsg(tc('errorShort'));
      return;
    }

    setErrorMsg('');
    setUploadState('loading');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 2));
    }, 150);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });

      clearInterval(interval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || tc('errorGen'));
      }

      const data = await res.json();
      setCoursePlan(data);
      setProgress(100);

      setTimeout(() => setUploadState('result'), 400);

    } catch (error: any) {
      clearInterval(interval);
      setErrorMsg(error.message || tc('errorGen'));
      setUploadState('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        {t('backHub')}
      </Link>

      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-stem-900 font-display mb-2">{t('createNew')}</h1>
        <p className="text-stem-600 text-lg font-medium">{tc('subtitle')}</p>
      </header>

      {/* Zone Principale */}
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-soft border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        {uploadState === 'idle' || uploadState === 'error' ? (
          <div className="relative z-10 flex flex-col items-center">

            <div className="w-full mb-6">
              <label className="block text-stem-900 font-bold mb-3 text-lg">{tc('pasteLabel')}</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={tc('pastePlaceholder')}
                className="w-full h-48 p-5 bg-stem-50/50 border border-stem-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 focus:border-stem-400 outline-none transition-all placeholder:text-stem-300 font-medium text-stem-900 resize-none shadow-inner"
              ></textarea>
            </div>

            {errorMsg && (
              <div className="w-full mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center gap-3 font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <button
              onClick={startGeneration}
              className="btn-3d w-full md:w-auto bg-stem-600 hover:bg-stem-800 text-white font-extrabold py-4 px-10 rounded-2xl shadow-button-teal flex items-center justify-center gap-3 text-lg transition-colors"
            >
              <Sparkles className="w-6 h-6 fill-white/20" />
              {tc('generateBtn')}
            </button>

            <p className="mt-6 text-sm font-medium text-stem-400">
              {tc('demoWarning')}
            </p>
          </div>
        ) : null}

        {uploadState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 relative z-10">
            <Loader2 className="w-14 h-14 text-accent-500 animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-stem-900 mb-2">{tc('analyzing')}</h3>
            <p className="text-stem-600 font-medium mb-8">{tc('creatingPlan')}</p>

            <div className="w-full max-w-md bg-stem-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-stem-400 to-accent-500 h-3 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="mt-4 text-xs font-bold text-stem-400">{progress}%</p>
          </div>
        )}

        {uploadState === 'result' && coursePlan && (
          <div className="text-center md:text-left py-8 animate-fade-in relative z-10">
            <div className="flex flex-col md:flex-row items-start justify-between mb-8 border-b border-stem-100 pb-8 gap-6">
              <div className="flex-1">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-md uppercase mb-3 inline-flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" /> {tc('generatedByAi')}
                </span>
                <h3 className="text-3xl md:text-4xl font-extrabold text-stem-900 mb-3 font-display">{coursePlan.courseTitle}</h3>
                <p className="text-stem-600 font-medium text-lg leading-relaxed">{coursePlan.summary}</p>
              </div>
              <button className="btn-3d bg-accent-500 hover:bg-orange-500 text-white font-extrabold py-4 px-8 rounded-2xl shadow-button flex items-center justify-center gap-3 w-full md:w-auto text-lg flex-shrink-0">
                <Play className="w-6 h-6 fill-white" /> {tc('startBtn')}
              </button>
            </div>

            {/* Aperçu du plan (Données réelles) */}
            <div className="bg-stem-50/50 rounded-3xl p-8 border border-stem-100">
               <h4 className="font-extrabold text-xl text-stem-900 mb-6 flex items-center gap-2">
                 <FileText className="w-5 h-5 text-stem-500" /> {tc('coursePlan')} ({tc('modulesCount', { count: coursePlan.modules.length })})
               </h4>
               <ul className="space-y-4">
                 {coursePlan.modules.map((mod, index) => (
                   <li key={mod.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-2xl border border-stem-100 shadow-sm hover:shadow-md transition-shadow">
                     <div className="w-10 h-10 rounded-xl bg-stem-100 text-stem-800 flex items-center justify-center text-sm font-extrabold flex-shrink-0">
                       {index + 1}
                     </div>
                     <div className="flex-1">
                       <h5 className="font-bold text-stem-900 text-lg mb-1">{mod.title}</h5>
                       <p className="text-sm text-stem-600 font-medium leading-relaxed">{mod.description}</p>
                     </div>
                     <div className="bg-stem-50 text-stem-600 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap self-start sm:self-auto border border-stem-100">
                       {tc('min', { min: mod.estimatedMinutes })}
                     </div>
                   </li>
                 ))}
               </ul>
            </div>

            <div className="mt-8 text-center">
               <button
                 onClick={() => {
                   setUploadState('idle');
                   setTextInput('');
                 }}
                 className="text-stem-500 font-bold text-sm hover:text-stem-700 transition-colors"
               >
                 {tc('restartBtn')}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
