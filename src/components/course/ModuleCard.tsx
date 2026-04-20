'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useCourse } from '@/contexts/CourseContext';

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

interface ModuleCardProps {
  module: Module;
  index: number;
  onTopicClick: (topicId: string) => void;
  onQuizClick: (moduleId: number) => void;
}

export default function ModuleCard({ module, index, onTopicClick, onQuizClick }: ModuleCardProps) {
  const { progress } = useCourse();

  const completedTopicsCount = module.topics.filter(t =>
    progress.completedTopics.includes(t.id)
  ).length;
  const totalTopics = module.topics.length;
  const progressPercent = totalTopics > 0 ? (completedTopicsCount / totalTopics) * 100 : 0;
  const isModuleComplete = progress.completedModules.includes(module.id.toString());

  return (
    <div className="bg-white rounded-3xl p-6 border border-stem-100 shadow-soft">
      {/* Header du module */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-extrabold text-stem-900 mb-2">
            Module {index + 1}: {module.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-stem-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              ~ {module.estimatedMinutes} min
            </span>
            <span>•</span>
            <span>{completedTopicsCount}/{totalTopics} topics</span>
          </div>
        </div>
        {isModuleComplete && (
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
        )}
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-stem-50 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-stem-400 to-accent-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Liste des topics */}
      <div className="space-y-2 mb-4">
        {module.topics.map((topic) => {
          const isComplete = progress.completedTopics.includes(topic.id);
          return (
            <button
              key={topic.id}
              onClick={() => onTopicClick(topic.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                isComplete
                  ? 'bg-green-50 hover:bg-green-100 border border-green-200'
                  : 'bg-stem-50 hover:bg-stem-100 border border-stem-200'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-stem-400 flex-shrink-0" />
              )}
              <span className={`text-sm font-medium text-left ${
                isComplete ? 'text-green-900' : 'text-stem-900'
              }`}>
                {topic.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bouton Quiz du module */}
      <button
        onClick={() => onQuizClick(module.id)}
        className="w-full btn-3d bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-4 rounded-xl shadow-button transition-all flex items-center justify-center gap-2"
      >
        <span>Quiz du Module</span>
        {progress.quizScores[`module-${module.id}`] !== undefined && (
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
            {Math.round(progress.quizScores[`module-${module.id}`])}%
          </span>
        )}
      </button>
    </div>
  );
}
