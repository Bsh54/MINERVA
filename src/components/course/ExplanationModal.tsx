'use client';

import { X, Loader2 } from 'lucide-react';
import { useCourse } from '@/contexts/CourseContext';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface ExplanationModalProps {
  topicId: string;
  topicTitle: string;
  onClose: () => void;
  onQuizClick: () => void;
}

export default function ExplanationModal({ topicId, topicTitle, onClose, onQuizClick }: ExplanationModalProps) {
  const t = useTranslations('Dashboard');
  const { explanations, loadingExplanations, loadExplanation, markTopicComplete, progress } = useCourse();
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  useEffect(() => {
    loadExplanation(topicId);
  }, [topicId, loadExplanation]);

  const isLoading = loadingExplanations.has(topicId);
  const explanation = explanations[topicId];
  const isComplete = progress.completedTopics.includes(topicId);

  const handleMarkComplete = () => {
    if (!isComplete && !hasMarkedComplete) {
      markTopicComplete(topicId);
      setHasMarkedComplete(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stem-100">
          <h2 className="text-2xl font-extrabold text-stem-900 font-display">{topicTitle}</h2>
          <button
            onClick={onClose}
            className="text-stem-400 hover:text-stem-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-accent-500 animate-spin mb-4" />
              <p className="text-stem-600 font-medium">{t('generatingExplanation')}</p>
            </div>
          ) : explanation ? (
            <div className="prose prose-stem max-w-none">
              <div className="text-stem-900 leading-relaxed whitespace-pre-wrap">
                {explanation}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-stem-500">
              <p>{t('failedToLoadExplanation')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && explanation && (
          <div className="flex items-center justify-between gap-4 p-6 border-t border-stem-100">
            <button
              onClick={handleMarkComplete}
              disabled={isComplete || hasMarkedComplete}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                isComplete || hasMarkedComplete
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : 'bg-stem-600 hover:bg-stem-800 text-white'
              }`}
            >
              {isComplete || hasMarkedComplete ? `✓ ${t('understood')}` : t('markAsUnderstood')}
            </button>

            <button
              onClick={onQuizClick}
              className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-extrabold py-3 px-8 rounded-xl shadow-button transition-all"
            >
              {t('takeQuiz')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
