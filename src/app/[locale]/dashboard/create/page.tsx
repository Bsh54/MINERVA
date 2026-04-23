'use client';

import { useTranslations } from 'next-intl';
import { Upload, Loader2, Play, ChevronLeft, FileText, Sparkles, AlertCircle, CheckSquare, Square, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import { generateCourseFromText } from '@/app/actions/ai';
import { useParams } from 'next/navigation';
import FileUploadZone from '@/components/FileUploadZone';

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
  const params = useParams();
  const locale = params.locale as string;

  const [uploadState, setUploadState] = useState<'idle' | 'loading' | 'result' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('file');
  const [isExtractingOCR, setIsExtractingOCR] = useState(false);
  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [additionalSpecs, setAdditionalSpecs] = useState('');
  const [draggedTopic, setDraggedTopic] = useState<{ moduleId: number; topicId: string } | null>(null);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<number | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [explanationLevel, setExplanationLevel] = useState<'simple' | 'detailed'>('detailed');
  const [isSaving, setIsSaving] = useState(false);

  const startGeneration = async () => {
    const finalText = inputMethod === 'file' ? extractedText : textInput;

    if (!finalText.trim() || finalText.length < 20) {
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
      const res = await generateCourseFromText(finalText, locale, explanationLevel, additionalSpecs);
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

  const addCustomTopic = (moduleId: number) => {
    setCurrentModuleId(moduleId);
    setNewTopicTitle('');
    setShowAddTopicModal(true);
  };

  const confirmAddTopic = () => {
    if (!newTopicTitle.trim() || currentModuleId === null) return;

    setCoursePlan(prev => {
      if (!prev) return prev;
      const updatedModules = prev.modules.map(mod => {
        if (mod.id === currentModuleId) {
          const newTopicId = `${currentModuleId}-custom-${Date.now()}`;
          const newTopic = { id: newTopicId, title: newTopicTitle.trim() };
          return {
            ...mod,
            topics: [...(mod.topics || []), newTopic]
          };
        }
        return mod;
      });
      return { ...prev, modules: updatedModules };
    });

    // Auto-sélectionner le nouveau topic
    const newTopicId = `${currentModuleId}-custom-${Date.now()}`;
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      newSet.add(newTopicId);
      return newSet;
    });

    setShowAddTopicModal(false);
    setNewTopicTitle('');
    setCurrentModuleId(null);
  };

  const handleDragStart = (moduleId: number, topicId: string) => {
    setDraggedTopic({ moduleId, topicId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetModuleId: number, targetTopicId: string) => {
    if (!draggedTopic || !coursePlan) return;

    const { moduleId: sourceModuleId, topicId: sourceTopicId } = draggedTopic;

    if (sourceModuleId !== targetModuleId) {
      setDraggedTopic(null);
      return; // Ne pas permettre de déplacer entre modules
    }

    setCoursePlan(prev => {
      if (!prev) return prev;

      const updatedModules = prev.modules.map(mod => {
        if (mod.id === sourceModuleId) {
          const topics = [...(mod.topics || [])];
          const sourceIndex = topics.findIndex(t => t.id === sourceTopicId);
          const targetIndex = topics.findIndex(t => t.id === targetTopicId);

          if (sourceIndex === -1 || targetIndex === -1) return mod;

          const [movedTopic] = topics.splice(sourceIndex, 1);
          topics.splice(targetIndex, 0, movedTopic);

          return { ...mod, topics };
        }
        return mod;
      });

      return { ...prev, modules: updatedModules };
    });

    setDraggedTopic(null);
  };

  const handleStartCourse = async () => {
    if (!coursePlan || selectedTopics.size === 0) return;

    setIsSaving(true);

    try {
      // Filtrer le plan pour ne garder que les topics sélectionnés
      const filteredModules = coursePlan.modules
        .map(mod => ({
          ...mod,
          topics: mod.topics.filter(topic => selectedTopics.has(topic.id.toString()))
        }))
        .filter(mod => mod.topics.length > 0);

      const finalPlan = {
        ...coursePlan,
        modules: filteredModules
      };

      // Sauvegarder en base de données
      const finalText = inputMethod === 'file' ? extractedText : textInput;

      const response = await fetch('/api/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: finalText,
          explanationLevel,
          additionalSpecs,
          coursePlan: finalPlan,
          locale
        })
      });

      const result = await response.json();

      if (result.success) {
        const courseId = result.courseId;

        // Lancer la pré-génération des 3 premiers topics en arrière-plan
        // Ne pas attendre la réponse - l'utilisateur peut commencer à apprendre
        fetch(`/api/courses/${courseId}/pregenerate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => {
          console.error('Erreur pré-génération (non bloquante):', err);
        });

        // Rediriger vers le cours immédiatement
        window.location.href = `/${locale}/dashboard/course/${courseId}`;
      } else {
        setErrorMsg(result.error || 'Erreur lors de la sauvegarde');
        setIsSaving(false);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Erreur lors de la sauvegarde');
      setIsSaving(false);
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

            {/* Toggle entre Upload et Text */}
            <div className="w-full mb-8">
              <div className="flex gap-4 p-2 bg-stem-100 rounded-2xl">
                <button
                  onClick={() => setInputMethod('file')}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                    inputMethod === 'file'
                      ? 'bg-white text-stem-900 shadow-md'
                      : 'text-stem-600 hover:text-stem-900'
                  }`}
                >
                  📄 {locale === 'fr' ? 'Télécharger un fichier' : 'Upload File'}
                </button>
                <button
                  onClick={() => setInputMethod('text')}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                    inputMethod === 'text'
                      ? 'bg-white text-stem-900 shadow-md'
                      : 'text-stem-600 hover:text-stem-900'
                  }`}
                >
                  ✏️ {locale === 'fr' ? 'Coller du texte' : 'Paste Text'}
                </button>
              </div>
            </div>

            {/* Zone d'upload de fichier */}
            {inputMethod === 'file' && (
              <div className="w-full mb-6">
                <label className="block text-stem-900 font-bold mb-3 text-lg">
                  {locale === 'fr' ? 'Télécharger un document ou une image' : 'Upload a document or image'}
                </label>
                <FileUploadZone
                  onTextExtracted={(text) => {
                    setExtractedText(text);
                    setErrorMsg('');
                  }}
                  onExtractionStateChange={(isExtracting) => {
                    setIsExtractingOCR(isExtracting);
                  }}
                  locale={locale}
                />
              </div>
            )}

            {/* Zone de texte manuel */}
            {inputMethod === 'text' && (
              <div className="w-full mb-6">
                <label className="block text-stem-900 font-bold mb-3 text-lg">{tc('pasteLabel')}</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={tc('pastePlaceholder')}
                  className="w-full h-48 p-5 bg-stem-50/50 border border-stem-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 focus:border-stem-400 outline-none transition-all placeholder:text-stem-300 font-medium text-stem-900 resize-none shadow-inner"
                ></textarea>
              </div>
            )}

            <div className="w-full mb-6">
              <label className="block text-stem-900 font-bold mb-3 text-lg">{tc('explanationLevelLabel')}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExplanationLevel('simple')}
                  className={`p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
                    explanationLevel === 'simple'
                      ? 'border-accent-500 bg-gradient-to-br from-accent-50 to-orange-50 shadow-lg scale-105'
                      : 'border-stem-200 bg-white hover:border-accent-300 hover:shadow-md'
                  }`}
                >
                  {explanationLevel === 'simple' && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className={`font-extrabold text-xl mb-2 ${explanationLevel === 'simple' ? 'text-accent-600' : 'text-stem-900'}`}>
                      {tc('simpleResume')}
                    </div>
                    <div className={`text-sm font-medium ${explanationLevel === 'simple' ? 'text-accent-700' : 'text-stem-600'}`}>
                      {tc('simpleResumeDesc')}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExplanationLevel('detailed')}
                  className={`p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
                    explanationLevel === 'detailed'
                      ? 'border-stem-500 bg-gradient-to-br from-stem-50 to-teal-50 shadow-lg scale-105'
                      : 'border-stem-200 bg-white hover:border-stem-400 hover:shadow-md'
                  }`}
                >
                  {explanationLevel === 'detailed' && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-stem-600 rounded-full flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className={`font-extrabold text-xl mb-2 ${explanationLevel === 'detailed' ? 'text-stem-600' : 'text-stem-900'}`}>
                      {tc('detailedExplanation')}
                    </div>
                    <div className={`text-sm font-medium ${explanationLevel === 'detailed' ? 'text-stem-700' : 'text-stem-600'}`}>
                      {tc('detailedExplanationDesc')}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="w-full mb-6">
              <label className="block text-stem-900 font-bold mb-3 text-sm">{tc('specsLabel')}</label>
              <textarea
                value={additionalSpecs}
                onChange={(e) => setAdditionalSpecs(e.target.value)}
                placeholder={tc('specsPlaceholder')}
                className="w-full h-20 p-4 bg-stem-50/50 border border-stem-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 focus:border-stem-400 outline-none transition-all placeholder:text-stem-300 font-medium text-stem-900 text-sm resize-none shadow-inner"
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
              disabled={isExtractingOCR || (inputMethod === 'file' && !extractedText) || (inputMethod === 'text' && !textInput)}
              className="btn-3d w-full md:w-auto bg-stem-600 hover:bg-stem-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 text-white font-extrabold py-4 px-10 rounded-2xl shadow-button-teal flex items-center justify-center gap-3 text-lg transition-colors"
            >
              {isExtractingOCR ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {locale === 'fr' ? 'Extraction en cours...' : 'Extracting...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 fill-white/20" />
                  {tc('generateBtn')}
                </>
              )}
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
              {tc('pleaseWait')}
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
                           <p className="text-xs text-stem-500 font-bold uppercase tracking-wider">{tc('min', { min: mod.estimatedMinutes })} • {selectedCount}/{moduleTopicIds.length} {tc('selected')}</p>
                         </div>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             addCustomTopic(mod.id);
                           }}
                           className="text-xs font-bold text-accent-600 hover:text-accent-800 px-3 py-1.5 bg-white border border-accent-200 rounded-lg hover:bg-accent-50 transition-colors flex items-center gap-1"
                         >
                           <span className="text-lg leading-none">+</span> {tc('addTopic')}
                         </button>
                       </div>

                       <div className="p-2 md:p-4 bg-white space-y-1">
                         {mod.topics?.map((topic) => {
                           const isTopicSelected = selectedTopics.has(topic.id.toString());
                           return (
                             <div
                               key={topic.id}
                               draggable
                               onDragStart={() => handleDragStart(mod.id, topic.id.toString())}
                               onDragOver={handleDragOver}
                               onDrop={() => handleDrop(mod.id, topic.id.toString())}
                               onClick={() => toggleTopic(topic.id.toString())}
                               className={`flex items-center gap-3 p-3 rounded-xl cursor-move transition-colors ${isTopicSelected ? 'bg-stem-50/50 hover:bg-stem-100' : 'hover:bg-gray-50'}`}
                             >
                               <div className="flex-shrink-0 ml-2 md:ml-6">
                                 {isTopicSelected ? <CheckSquare className="w-5 h-5 text-accent-500 fill-orange-50" /> : <Square className="w-5 h-5 text-gray-300" />}
                               </div>
                               <span className={`font-medium text-sm md:text-base flex-1 ${isTopicSelected ? 'text-stem-900 font-bold' : 'text-gray-600'}`}>
                                 {topic.title}
                               </span>
                               <span className="text-gray-400 text-xs">⋮⋮</span>
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
               <Link
                 href="/dashboard"
                 className="btn-3d bg-stem-600 hover:bg-stem-800 text-white font-extrabold py-4 px-10 rounded-2xl shadow-button-teal flex items-center justify-center gap-3 w-full sm:w-auto text-lg transition-all"
               >
                 <ChevronLeft className="w-5 h-5" />
                 {tc('backButton')}
               </Link>

               <button
                 disabled={selectedTopics.size === 0 || isSaving}
                 onClick={handleStartCourse}
                 className="btn-3d bg-accent-500 hover:bg-orange-500 disabled:bg-gray-300 disabled:shadow-none disabled:translate-y-0 text-white font-extrabold py-4 px-10 rounded-2xl shadow-button flex items-center justify-center gap-3 w-full sm:w-auto text-lg transition-all"
               >
                 {isSaving ? (
                   <>
                     <Loader2 className="w-6 h-6 animate-spin" />
                     {tc('saving')}
                   </>
                 ) : (
                   <>
                     <Play className="w-6 h-6 fill-white" />
                     {selectedTopics.size === 0 ? tc('selectionRequired') : tc('startCourse')}
                   </>
                 )}
               </button>
            </div>

          </div>
        )}
      </div>

      {/* Modal d'ajout de topic */}
      {showAddTopicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-extrabold text-stem-900 font-display">{tc('addTopicTitle')}</h3>
              <button
                onClick={() => {
                  setShowAddTopicModal(false);
                  setNewTopicTitle('');
                }}
                className="text-stem-400 hover:text-stem-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-stem-900 font-bold mb-3 text-sm">{tc('topicTitleLabel')}</label>
              <input
                type="text"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAddTopic();
                  }
                }}
                placeholder={tc('topicTitlePlaceholder')}
                className="w-full px-4 py-3 bg-stem-50/50 border border-stem-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-stem-400/20 focus:border-stem-400 outline-none transition-all placeholder:text-stem-300 font-medium text-stem-900"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddTopicModal(false);
                  setNewTopicTitle('');
                }}
                className="flex-1 px-4 py-3 border-2 border-stem-200 text-stem-600 font-bold rounded-xl hover:bg-stem-50 transition-colors"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={confirmAddTopic}
                disabled={!newTopicTitle.trim()}
                className="flex-1 btn-3d bg-accent-500 hover:bg-accent-600 disabled:bg-gray-300 disabled:shadow-none text-white font-extrabold px-4 py-3 rounded-xl shadow-button transition-all"
              >
                {tc('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
