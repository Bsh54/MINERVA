'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2, CheckCircle, BookOpen } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useCourse } from '@/contexts/CourseContext';
import { useParams } from 'next/navigation';

export default function TopicPage() {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId as string;
  const courseId = params.id as string;

  const { course, explanations, loadingExplanations, loadExplanation, markTopicComplete, progress } = useCourse();
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  // Trouver le topic dans le cours
  let topicTitle = '';
  let moduleTitle = '';

  if (course) {
    for (const module of course.coursePlan.modules) {
      const topic = module.topics.find(t => t.id === topicId);
      if (topic) {
        topicTitle = topic.title;
        moduleTitle = module.title;
        break;
      }
    }
  }

  useEffect(() => {
    if (topicId) {
      loadExplanation(topicId);
    }
  }, [topicId]);

  const isLoading = loadingExplanations.has(topicId);
  const explanation = explanations[topicId];
  const isComplete = progress?.completedTopics?.includes(topicId) || false;

  const handleMarkComplete = () => {
    if (!isComplete && !hasMarkedComplete) {
      markTopicComplete(topicId);
      setHasMarkedComplete(true);
    }
  };

  const handleQuizClick = () => {
    router.push(`/dashboard/course/${courseId}/topic/${topicId}/quiz`);
  };

  if (!course) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/dashboard/course/${courseId}`}
        className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        Retour au cours
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-stem-50 to-teal-50 rounded-3xl p-8 mb-8 border border-stem-100">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 bg-stem-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-stem-500 uppercase tracking-wider mb-2">{moduleTitle}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-stem-900 font-display">{topicTitle}</h1>
          </div>
          {(isComplete || hasMarkedComplete) && (
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold">
              <CheckCircle className="w-5 h-5" />
              Compris
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8 md:p-12 mb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-accent-500 animate-spin mb-4" />
            <p className="text-stem-600 font-medium">Génération de l'explication...</p>
          </div>
        ) : explanation ? (
          <div className="prose prose-lg max-w-none">
            <div className="text-stem-900 leading-relaxed whitespace-pre-wrap text-lg">
              {explanation}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-stem-500">
            <p>Impossible de charger l'explication.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isLoading && explanation && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
          <button
            onClick={handleMarkComplete}
            disabled={isComplete || hasMarkedComplete}
            className={`px-8 py-4 rounded-xl font-bold transition-all text-lg ${
              isComplete || hasMarkedComplete
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-stem-600 hover:bg-stem-800 text-white shadow-button-teal'
            }`}
          >
            {isComplete || hasMarkedComplete ? '✓ Compris' : 'Marquer comme compris'}
          </button>

          <button
            onClick={handleQuizClick}
            className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-extrabold py-4 px-10 rounded-xl shadow-button transition-all text-lg"
          >
            Passer le Quiz →
          </button>
        </div>
      )}
    </div>
  );
}
