'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2, CheckCircle, BookOpen, Home } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useCourse } from '@/contexts/CourseContext';
import { useParams } from 'next/navigation';

// Simple markdown to HTML converter with proper spacing
function formatMarkdown(text: string): string {
  let html = text;

  // Normalize line breaks
  html = html.replace(/\r\n/g, '\n');

  // Headers (with spacing)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-2xl font-extrabold text-stem-900 mt-8 mb-4 first:mt-0">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-3xl font-extrabold text-stem-900 mt-10 mb-5 first:mt-0">$1</h2>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stem-900 bg-stem-50 px-1 rounded">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-accent-600">$1</em>');

  // Code inline
  html = html.replace(/`(.+?)`/g, '<code class="bg-stem-100 text-stem-900 px-2 py-1 rounded font-mono text-sm border border-stem-200">$1</code>');

  // Blockquotes (with icon and styling)
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-accent-500 bg-accent-50 py-4 px-6 rounded-r-xl my-6 text-accent-900 font-medium">💡 $1</blockquote>');

  // Process lists
  const lines = html.split('\n');
  const processed: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.match(/^- (.+)$/)) {
      if (!inUl) {
        processed.push('<ul class="space-y-2 my-6 ml-6">');
        inUl = true;
      }
      processed.push(line.replace(/^- (.+)$/, '<li class="flex items-start gap-3"><span class="text-accent-500 font-bold mt-1">•</span><span class="flex-1 text-stem-800">$1</span></li>'));
    } else if (line.match(/^\d+\. (.+)$/)) {
      if (!inOl) {
        processed.push('<ol class="space-y-3 my-6 ml-6 list-decimal list-inside">');
        inOl = true;
      }
      processed.push(line.replace(/^\d+\. (.+)$/, '<li class="text-stem-800 font-medium"><span class="font-bold text-stem-900">$1</span></li>'));
    } else {
      if (inUl) {
        processed.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        processed.push('</ol>');
        inOl = false;
      }
      if (line) {
        processed.push(line);
      } else {
        processed.push('');
      }
    }
  }

  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  html = processed.join('\n');

  // Paragraphs (preserve spacing, add margin)
  const blocks = html.split('\n\n');
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<blockquote')) {
      return trimmed;
    }
    return `<p class="text-stem-800 leading-relaxed my-4 text-lg">${trimmed}</p>`;
  }).filter(b => b).join('\n\n');

  return html;
}

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
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href={`/dashboard/course/${courseId}`}
          className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('backToCourse')}
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold transition-colors"
        >
          <Home className="w-5 h-5" />
          {t('dashboard')}
        </Link>
      </div>

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
              {t('understood')}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8 md:p-12 mb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-accent-500 animate-spin mb-4" />
            <p className="text-stem-600 font-medium">{t('generatingExplanation')}</p>
          </div>
        ) : explanation ? (
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(explanation) }} />
          </div>
        ) : (
          <div className="text-center py-16 text-stem-500">
            <p>{t('failedToLoadExplanation')}</p>
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
            {isComplete || hasMarkedComplete ? `✓ ${t('understood')}` : t('markAsUnderstood')}
          </button>

          <button
            onClick={handleQuizClick}
            className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-extrabold py-4 px-10 rounded-xl shadow-button transition-all text-lg"
          >
            {t('takeQuiz')} →
          </button>
        </div>
      )}
    </div>
  );
}
