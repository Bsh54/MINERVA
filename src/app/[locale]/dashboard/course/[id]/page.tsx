'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, BookOpen, Trophy, Home } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCourse } from '@/contexts/CourseContext';
import ModuleCard from '@/components/course/ModuleCard';
import ExplanationModal from '@/components/course/ExplanationModal';
import QuizModal from '@/components/course/QuizModal';

export default function CoursePage() {
  const t = useTranslations('Dashboard');
  const tCourse = useTranslations('CoursePage');
  const { course, progress } = useCourse();
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; title: string } | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<{ id: string; type: 'topic' | 'module'; title: string } | null>(null);

  if (!course) return null;

  const totalTopics = course.coursePlan.modules.reduce((acc, mod) => acc + mod.topics.length, 0);
  const completedTopicsCount = progress?.completedTopics?.length || 0;
  const progressPercent = totalTopics > 0 ? (completedTopicsCount / totalTopics) * 100 : 0;

  const handleTopicClick = (topicId: string) => {
    window.location.href = `/dashboard/course/${course.id}/topic/${topicId}`;
  };

  const handleModuleQuizClick = (moduleId: number) => {
    const module = course.coursePlan.modules.find(m => m.id === moduleId);
    if (module) {
      setSelectedQuiz({
        id: moduleId.toString(),
        type: 'module',
        title: `Quiz: ${module.title}`
      });
    }
  };

  const handleTopicQuizClick = () => {
    if (selectedTopic) {
      setSelectedQuiz({
        id: selectedTopic.id,
        type: 'topic',
        title: `Quiz: ${selectedTopic.title}`
      });
      setSelectedTopic(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('backHub')}
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold transition-colors"
        >
          <Home className="w-5 h-5" />
          {t('dashboard')}
        </Link>
      </div>

      {/* Course Info */}
      <div className="bg-gradient-to-br from-stem-600 to-stem-800 rounded-3xl p-8 md:p-12 mb-8 text-white shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-6 h-6" />
              <span className="text-sm font-bold uppercase tracking-wider opacity-90">{tCourse('courseLabel')}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 font-display">
              {course.coursePlan.courseTitle}
            </h1>
            <p className="text-lg opacity-90 leading-relaxed max-w-3xl">
              {course.coursePlan.summary}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-12 h-12" />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm">
          <div
            className="bg-gradient-to-r from-accent-400 to-accent-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-sm font-bold">
          <span>{tCourse('topicsCompleted', { completed: completedTopicsCount, total: totalTopics })}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {course.coursePlan.modules.map((module, index) => (
          <ModuleCard
            key={module.id}
            module={module}
            index={index}
            courseId={course.id}
            onTopicClick={handleTopicClick}
            onQuizClick={handleModuleQuizClick}
          />
        ))}
      </div>

      {/* Modals */}
      {selectedTopic && (
        <ExplanationModal
          topicId={selectedTopic.id}
          topicTitle={selectedTopic.title}
          onClose={() => setSelectedTopic(null)}
          onQuizClick={handleTopicQuizClick}
        />
      )}

      {selectedQuiz && (
        <QuizModal
          targetId={selectedQuiz.id}
          targetType={selectedQuiz.type}
          title={selectedQuiz.title}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </div>
  );
}
