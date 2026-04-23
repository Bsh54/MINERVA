'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2, CheckCircle, BookOpen, Home, Download } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useCourse } from '@/contexts/CourseContext';
import { useParams } from 'next/navigation';

// Dynamic import for pdfMake (client-side only)
let pdfMake: any = null;
if (typeof window !== 'undefined') {
  import('pdfmake/build/pdfmake').then(module => {
    pdfMake = module.default;
    import('pdfmake/build/vfs_fonts').then(fonts => {
      // @ts-ignore
      pdfMake.vfs = fonts.default.pdfMake.vfs;
    });
  });
}

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

    // Regular paragraphs - apply inline formatting with proper order
    // First protect code blocks from other formatting
    const inlineCodes: string[] = [];
    line = line.replace(/`(.+?)`/g, (match, code) => {
      const placeholder = `__CODE_${inlineCodes.length}__`;
      inlineCodes.push(`<code class="bg-stem-100 text-stem-900 px-2 py-1 rounded font-mono text-sm border border-stem-200">${code}</code>`);
      return placeholder;
    });

    // Then apply bold and italic
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stem-900 bg-stem-50 px-1 rounded">$1</strong>');
    line = line.replace(/\*(.+?)\*/g, '<em class="italic text-accent-600">$1</em>');

    // Restore code blocks
    inlineCodes.forEach((code, idx) => {
      line = line.replace(`__CODE_${idx}__`, code);
    });

    processed.push(`<p class="text-stem-800 leading-relaxed my-4 text-lg">${line}</p>`);
  }

  // Close any open lists
  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  return processed.join('\n');
}

export default function TopicPage() {
  const t = useTranslations('Dashboard');
  const tTopic = useTranslations('TopicPage');
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId as string;
  const courseId = params.id as string;
  const contentRef = useRef<HTMLDivElement>(null);

  const { course, explanations, loadingExplanations, loadExplanation, markTopicComplete, progress } = useCourse();
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
    if (!explanation || !pdfMake) {
      console.error(tTopic('pdfError'));
      return;
    }

    setIsDownloading(true);

    try {
      // Convert markdown to pdfmake content
      const lines = explanation.split('\n');
      const content: any[] = [];

      // Add header
      content.push({
        text: moduleTitle,
        style: 'moduleTitle',
        margin: [0, 0, 0, 5]
      });
      content.push({
        text: topicTitle,
        style: 'header',
        margin: [0, 0, 0, 20]
      });

      let inList = false;
      let listItems: any[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          if (inList) {
            content.push({ ul: listItems, margin: [0, 5, 0, 10] });
            listItems = [];
            inList = false;
          }
          continue;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          if (inList) {
            content.push({ ul: listItems, margin: [0, 5, 0, 10] });
            listItems = [];
            inList = false;
          }
          content.push({
            text: trimmed.replace(/^### /, ''),
            style: 'subheader',
            margin: [0, 15, 0, 8]
          });
          continue;
        }

        if (trimmed.startsWith('## ')) {
          if (inList) {
            content.push({ ul: listItems, margin: [0, 5, 0, 10] });
            listItems = [];
            inList = false;
          }
          content.push({
            text: trimmed.replace(/^## /, ''),
            style: 'subheader',
            margin: [0, 15, 0, 8]
          });
          continue;
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          if (inList) {
            content.push({ ul: listItems, margin: [0, 5, 0, 10] });
            listItems = [];
            inList = false;
          }
          content.push({
            text: '💡 ' + trimmed.replace(/^> /, ''),
            style: 'blockquote',
            margin: [0, 10, 0, 10]
          });
          continue;
        }

        // Lists
        if (trimmed.startsWith('- ') || trimmed.match(/^\d+\. /)) {
          const text = trimmed.replace(/^[-\d]+\.?\s/, '');
          listItems.push({ text, margin: [0, 2, 0, 2] });
          inList = true;
          continue;
        }

        // Regular paragraph
        if (inList) {
          content.push({ ul: listItems, margin: [0, 5, 0, 10] });
          listItems = [];
          inList = false;
        }

        // Process inline formatting
        let processedText = trimmed;
        processedText = processedText.replace(/\*\*(.+?)\*\*/g, '$1'); // Bold (pdfmake doesn't support inline bold easily)
        processedText = processedText.replace(/`(.+?)`/g, '$1'); // Code

        content.push({
          text: processedText,
          style: 'paragraph',
          margin: [0, 0, 0, 8]
        });
      }

      if (inList) {
        content.push({ ul: listItems, margin: [0, 5, 0, 10] });
      }

      const docDefinition: any = {
        content,
        styles: {
          header: {
            fontSize: 24,
            bold: true,
            color: '#134E4A',
            margin: [0, 0, 0, 10]
          },
          moduleTitle: {
            fontSize: 10,
            bold: true,
            color: '#0D9488',
            margin: [0, 0, 0, 5]
          },
          subheader: {
            fontSize: 18,
            bold: true,
            color: '#134E4A',
            margin: [0, 10, 0, 5]
          },
          paragraph: {
            fontSize: 12,
            color: '#0F766E',
            lineHeight: 1.5
          },
          blockquote: {
            fontSize: 12,
            color: '#9A3412',
            italics: true,
            margin: [10, 5, 0, 5]
          }
        },
        defaultStyle: {
          font: 'Roboto'
        }
      };

      const filename = `${topicTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      pdfMake.createPdf(docDefinition).download(filename);
    } catch (error) {
      console.error(tTopic('pdfGenerationError'), error);
    } finally {
      setIsDownloading(false);
    }
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
              disabled={isDownloading}
              className="flex items-center gap-2 px-6 py-4 rounded-xl font-bold transition-all text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {tTopic('generating')}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {tTopic('downloadPdf')}
                </>
              )}
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
