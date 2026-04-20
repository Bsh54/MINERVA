'use client';

import { useTranslations } from 'next-intl';
import { Upload, Loader2, Play, ChevronLeft, FileText, Sparkles, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import { generateCourseFromText } from '@/app/actions/ai';

interface Topic {
  id: string;
  title: string;
}

interface Module {
  id: number;
  title: string;
  estimatedMinutes: number;
  topics: Topic[];
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
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const startGeneration = async () => {
    if (!textInput.trim() || textInput.length < 20) {
      setErrorMsg(tc('errorShort'));
      return;
    }

    setErrorMsg('');
    setUploadState('loading');
    setProgress(0);

    // Progression lente (ne s'arrête pas par timeout)
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 98 ? 98 : prev + 1));
    }, 400);

    try {
      const res = await generateCourseFromText(textInput);
      clearInterval(interval);

      if (!res.success || !res.data) {
        throw new Error(res.error || tc('errorGen'));
      }

      const plan = res.data as CoursePlan;
      setCoursePlan(plan);

      const allTopicIds = new Set<string>();
      if (plan.modules) {
        plan.modules.forEach(mod => {
          if (mod.topics) {
            mod.topics.forEach(topic => {
              allTopicIds.add(topic.id.toString());
            });
          }
        });
      }
      setSelectedTopics(allTopicIds);

      setProgress(100);
      setTimeout(() => setUploadState('result'), 400);

    } catch (error: any) {
      clearInterval(interval);
      setErrorMsg(error.message || tc('errorGen'));
      setUploadState('error');
    }
  };

  const toggleTopic = (topicId: string) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(topicId)) {
      newSelected.delete(topicId);
    } else {
      newSelected.add(topicId);
    }
    setSelectedTopics(newSelected);
  };

  const toggleModule = (mod: Module) => {
    if (!mod.topics) return;
    const moduleTopicIds = mod.topics.map(t => t.id.toString());
    const allSelected = moduleTopicIds.every(id => selectedTopics.has(id));

    const newSelected = new Set(selectedTopics);
    if (allSelected) {
      moduleTopicIds.forEach(id => newSelected.delete(id));
    } else {
      moduleTopicIds.forEach(id => newSelected.add(id));
    }
    setSelectedTopics(newSelected);
  };

  const selectAll = () => {
    if (!coursePlan || !coursePlan.modules) return;
    const allTopicIds = new Set<string>();
    coursePlan.modules.forEach(mod => {
      if (mod.topics) {
        mod.topics.forEach(t => allTopicIds.add(t.id.toString()));
      }
    });
    setSelectedTopics(allTopicIds);
  };

  const deselectAll = () => {
    setSelectedTopics(new Set());
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
            <p className="text-stem-600 font-medium mb-8 text-center max-w-sm">
              L'IA génère un plan très détaillé. Cela peut prendre <strong>jusqu'à une minute</strong>. Ne quittez pas la page.
            </p>

            <div className="w-full max-w-md bg-stem-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-stem-400 to-accent-500 h-3 rounded-full transition-all duration-500 ease-out relative"
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
            </div>

            <div className="bg-stem-50/50 rounded-3xl p-6 md:p-8 border border-stem-100 mb-8">
               <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-stem-100 pb-6">
                 <h4 className="font-extrabold text-xl text-stem-900 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-stem-500" /> {tc('selectTopics')}
                 </h4>
                 <div className="flex gap-3">
                   <button onClick={selectAll} className="text-xs font-bold text-stem-600 hover:text-stem-900 px-3 py-1.5 bg-white border border-stem-200 rounded-lg hover:bg-stem-50 transition-colors">
                     {tc('selectAll')}
                   </button>
                   <button onClick={deselectAll} className="text-xs font-bold text-stem-600 hover:text-stem-900 px-3 py-1.5 bg-white border border-stem-200 rounded-lg hover:bg-stem-50 transition-colors">
                     {tc('deselectAll')}
                   </button>
                 </div>
               </div>

               <div className="space-y-6">
                 {coursePlan.modules?.map((mod, index) => {
                   const moduleTopicIds = mod.topics?.map(t => t.id.toString()) || [];
                   const selectedCount = moduleTopicIds.filter(id => selectedTopics.has(id)).length;
                   const isAllSelected = selectedCount === moduleTopicIds.length && moduleTopicIds.length > 0;
                   const isPartial = selectedCount > 0 && !isAllSelected;

                   return (
                     <div key={mod.id || index} className="bg-white rounded-2xl border border-stem-200 shadow-sm overflow-hidden">
                       <div
                         onClick={() => toggleModule(mod)}
                         className="flex items-center gap-4 p-4 md:p-5 bg-stem-50/50 hover:bg-stem-50 cursor-pointer transition-colors border-b border-stem-100"
                       >
                         <div className="text-stem-600 flex-shrink-0">
                           {isAllSelected ? <CheckSquare className="w-6 h-6 text-stem-600 fill-stem-100" /> :
                            isPartial ? <div className="w-6 h-6 rounded border-2 border-stem-600 bg-stem-100 flex items-center justify-center"><div className="w-3 h-0.5 bg-stem-600 rounded"></div></div> :
                            <Square className="w-6 h-6 text-stem-300" />}
                         </div>
                         <div className="flex-1">
                           <h5 className="font-extrabold text-stem-900 text-lg">Module {index + 1}: {mod.title}</h5>
                           <p className="text-xs text-stem-500 font-bold uppercase tracking-wider">{tc('min', { min: mod.estimatedMinutes })} • {selectedCount}/{moduleTopicIds.length} sélectionnés</p>
                         </div>
                       </div>

                       <div className="p-2 md:p-4 bg-white space-y-1">
                         {mod.topics?.map((topic) => {
                           const isTopicSelected = selectedTopics.has(topic.id.toString());
                           return (
                             <div
                               key={topic.id}
                               onClick={() => toggleTopic(topic.id.toString())}
                               className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isTopicSelected ? 'bg-stem-50/50 hover:bg-stem-100' : 'hover:bg-gray-50'}`}
                             >
                               <div className="flex-shrink-0 ml-2 md:ml-6">
                                 {isTopicSelected ? <CheckSquare className="w-5 h-5 text-accent-500 fill-orange-50" /> : <Square className="w-5 h-5 text-gray-300" />}
                               </div>
                               <span className={`font-medium text-sm md:text-base ${isTopicSelected ? 'text-stem-900 font-bold' : 'text-gray-600'}`}>
                                 {topic.title}
                               </span>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-stem-100 pt-8">
               <button
                 onClick={() => {
                   setUploadState('idle');
                   setTextInput('');
                 }}
                 className="text-stem-500 font-bold text-sm hover:text-stem-700 transition-colors"
               >
                 {tc('restartBtn')}
               </button>

               <button
                 disabled={selectedTopics.size === 0}
                 className="btn-3d bg-accent-500 hover:bg-orange-500 disabled:bg-gray-300 disabled:shadow-none disabled:translate-y-0 text-white font-extrabold py-4 px-10 rounded-2xl shadow-button flex items-center justify-center gap-3 w-full sm:w-auto text-lg transition-all"
               >
                 <Play className="w-6 h-6 fill-white" />
                 {selectedTopics.size === 0 ? "Sélection requise" : tc('startSelected')}
               </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
