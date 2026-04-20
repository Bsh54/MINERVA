'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

interface CourseData {
  id: string;
  title: string;
  summary: string;
  coursePlan: CoursePlan;
  locale: string;
}

interface UserProgress {
  completedTopics: string[];
  completedModules: string[];
  quizScores: Record<string, number>;
}

interface TopicExplanation {
  topicId: string;
  explanation: string;
}

interface CourseContextType {
  course: CourseData | null;
  progress: UserProgress;
  explanations: Record<string, string>;
  loadingExplanations: Set<string>;
  loadExplanation: (topicId: string) => Promise<void>;
  markTopicComplete: (topicId: string) => void;
  markModuleComplete: (moduleId: string) => void;
  saveQuizScore: (targetId: string, targetType: string, score: number) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export function CourseProvider({
  children,
  courseData
}: {
  children: React.ReactNode;
  courseData: CourseData;
}) {
  const [course] = useState<CourseData>(courseData);
  const [progress, setProgress] = useState<UserProgress>({
    completedTopics: [],
    completedModules: [],
    quizScores: {}
  });
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Set<string>>(new Set());

  // Charger la progression au montage
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await fetch(`/api/courses/${course.id}/progress`);
      const data = await response.json();
      if (data.success && data.progress) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Erreur chargement progression:', error);
    }
  };

  const loadExplanation = async (topicId: string) => {
    if (explanations[topicId] || loadingExplanations.has(topicId)) return;

    setLoadingExplanations(prev => new Set(prev).add(topicId));

    try {
      const response = await fetch(`/api/courses/${course.id}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId })
      });

      const data = await response.json();

      if (data.success && data.explanation) {
        setExplanations(prev => ({
          ...prev,
          [topicId]: data.explanation
        }));
      }
    } catch (error) {
      console.error('Erreur chargement explication:', error);
    } finally {
      setLoadingExplanations(prev => {
        const newSet = new Set(prev);
        newSet.delete(topicId);
        return newSet;
      });
    }
  };

  const markTopicComplete = (topicId: string) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        completedTopics: [...prev.completedTopics, topicId]
      };
      saveProgress(newProgress);
      return newProgress;
    });
  };

  const markModuleComplete = (moduleId: string) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        completedModules: [...prev.completedModules, moduleId]
      };
      saveProgress(newProgress);
      return newProgress;
    });
  };

  const saveQuizScore = (targetId: string, targetType: string, score: number) => {
    const key = targetType === 'module' ? `module-${targetId}` : targetId;
    setProgress(prev => {
      const newProgress = {
        ...prev,
        quizScores: { ...prev.quizScores, [key]: score }
      };
      saveProgress(newProgress);
      return newProgress;
    });
  };

  const saveProgress = async (newProgress: UserProgress) => {
    try {
      await fetch(`/api/courses/${course.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgress)
      });
    } catch (error) {
      console.error('Erreur sauvegarde progression:', error);
    }
  };

  return (
    <CourseContext.Provider value={{
      course,
      progress,
      explanations,
      loadingExplanations,
      loadExplanation,
      markTopicComplete,
      markModuleComplete,
      saveQuizScore
    }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within CourseProvider');
  }
  return context;
}
