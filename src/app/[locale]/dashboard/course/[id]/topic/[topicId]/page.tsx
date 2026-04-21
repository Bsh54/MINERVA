'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2, CheckCircle, BookOpen, Home, Download } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useCourse } from '@/contexts/CourseContext';
import { useParams } from 'next/navigation';

// Simple markdown to HTML converter with proper spacing
function formatMarkdown(text: string): string {
  if (!text) return '';

  let html = text;

  // Normalize line breaks
  html = html.replace(/\r\n/g, '\n');

  // Process line by line to avoid nesting issues
  const lines = html.split('\n');
  const processed: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close lists if we're not in a list item anymore
    if (inUl && !line.trim().match(/^- /)) {
      processed.push('</ul>');
      inUl = false;
    }
    if (inOl && !line.trim().match(/^\d+\. /)) {
      processed.push('</ol>');
      inOl = false;
    }

    // Headers
    if (line.match(/^### /)) {
      line = line.replace(/^### (.+)$/, '<h3 class="text-2xl font-extrabold text-stem-900 mt-8 mb-4 first:mt-0">$1</h3>');
      processed.push(line);
      continue;
    }
    if (line.match(/^## /)) {
      line = line.replace(/^## (.+)$/, '<h2 class="text-3xl font-extrabold text-stem-900 mt-10 mb-5 first:mt-0">$1</h2>');
      processed.push(line);
      continue;
    }

    // Blockquotes
    if (line.match(/^> /)) {
      line = line.replace(/^> (.+)$/, '<blockquote class="border-l-4 border-accent-500 bg-accent-50 py-4 px-6 rounded-r-xl my-6 text-accent-900 font-medium">💡 $1</blockquote>');
      processed.push(line);
      continue;
    }

    // Unordered lists
    if (line.match(/^- /)) {
      if (!inUl) {
        processed.push('<ul class="space-y-2 my-6 ml-6">');
        inUl = true;
      }
      line = line.replace(/^- (.+)$/, '<li class="flex items-start gap-3"><span class="text-accent-500 font-bold mt-1">•</span><span class="flex-1 text-stem-800">$1</span></li>');
      processed.push(line);
      continue;
    }

    // Ordered lists
    if (line.match(/^\d+\. /)) {
      if (!inOl) {
        processed.push('<ol class="space-y-3 my-6 ml-6 list-decimal list-inside">');
        inOl = true;
      }
      line = line.replace(/^\d+\. (.+)$/, '<li class="text-stem-800 font-medium">$1</li>');
      processed.push(line);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      processed.push('');
      continue;
    }

    // Regular paragraphs - apply inline formatting
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stem-900 bg-stem-50 px-1 rounded">$1</strong>');
    line = line.replace(/\*(.+?)\*/g, '<em class="italic text-accent-600">$1</em>');
    line = line.replace(/`(.+?)`/g, '<code class="bg-stem-100 text-stem-900 px-2 py-1 rounded font-mono text-sm border border-stem-200">$1</code>');

    processed.push(`<p class="text-stem-800 leading-relaxed my-4 text-lg">${line}</p>`);
  }

  // Close any open lists
  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  return processed.join('\n');
}

export default function TopicPage() {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId as string;
  const courseId = params.id as string;
  const contentRef = useRef<HTMLDivElement>(null);

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
  }, [topicId, loadExplanation]);

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

  const handleDownloadPDF = () => {
    if (!explanation) return;

    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${topicTitle}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #134E4A;
            }
            h1 {
              color: #134E4A;
              font-size: 32px;
              font-weight: 800;
              margin-bottom: 10px;
            }
            h2 {
              color: #134E4A;
              font-size: 28px;
              font-weight: 800;
              margin-top: 40px;
              margin-bottom: 20px;
            }
            h3 {
              color: #134E4A;
              font-size: 24px;
              font-weight: 800;
              margin-top: 32px;
              margin-bottom: 16px;
            }
            p {
              color: #0F766E;
              font-size: 18px;
              margin: 16px 0;
            }
            strong {
              font-weight: 700;
              color: #134E4A;
              background: #F0FDFA;
              padding: 2px 4px;
              border-radius: 4px;
            }
            em {
              font-style: italic;
              color: #EA580C;
            }
            code {
              background: #E0F2FE;
              color: #134E4A;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 14px;
              border: 1px solid #BAE6FD;
            }
            blockquote {
              border-left: 4px solid #EA580C;
              background: #FFF7ED;
              padding: 16px 24px;
              border-radius: 0 12px 12px 0;
              margin: 24px 0;
              color: #9A3412;
              font-weight: 500;
            }
            ul, ol {
              margin: 24px 0;
              padding-left: 24px;
            }
            li {
              color: #0F766E;
              margin: 8px 0;
            }
            .header {
              border-bottom: 3px solid #134E4A;
              padding-bottom: 20px;
              margin-bottom: 40px;
            }
            .module-title {
              color: #0D9488;
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="module-title">${moduleTitle}</div>
            <h1>${topicTitle}</h1>
          </div>
          ${formatMarkdown(explanation)}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
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
          <div ref={contentRef} className="prose prose-lg max-w-none">
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
          <div className="flex flex-col sm:flex-row items-center gap-4">
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
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-6 py-4 rounded-xl font-bold transition-all text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <Download className="w-5 h-5" />
              Télécharger PDF
            </button>
          </div>

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
