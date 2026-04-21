'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Loader2, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCourse } from '@/contexts/CourseContext';
import { useParams } from 'next/navigation';

interface Question {
  id: string;
  type: 'mcq' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: number | boolean;
}

export default function TopicQuizPage() {
  const t = useTranslations('Dashboard');
  const params = useParams();
  const topicId = params.topicId as string;
  const courseId = params.id as string;

  const { course, saveQuizScore } = useCourse();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Trouver le topic
  let topicTitle = '';
  let currentModuleId: number | null = null;
  let currentTopicIndex = -1;
  let nextTopicId: string | null = null;
  let moduleTopics: any[] = [];

  if (course) {
    for (const module of course.coursePlan.modules) {
      const topicIndex = module.topics.findIndex(t => t.id === topicId);
      if (topicIndex !== -1) {
        topicTitle = module.topics[topicIndex].title;
        currentModuleId = module.id;
        currentTopicIndex = topicIndex;
        moduleTopics = module.topics;

        // Trouver le topic suivant
        if (topicIndex < module.topics.length - 1) {
          nextTopicId = module.topics[topicIndex + 1].id;
        }
        break;
      }
    }
  }

  useEffect(() => {
    loadQuiz();
  }, [topicId]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: topicId, targetType: 'topic' })
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Erreur chargement quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: any) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: answer });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });

    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setShowResults(true);

    saveQuizScore(topicId, 'topic', finalScore);
  };

  if (!course) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-accent-500 animate-spin mb-4" />
          <p className="text-stem-600 font-medium">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const passed = score >= 70;
    const isLastTopicInModule = currentTopicIndex === moduleTopics.length - 1;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8 md:p-12 text-center">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            passed ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            {passed ? (
              <Trophy className="w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="w-12 h-12 text-orange-600" />
            )}
          </div>

          <h2 className="text-3xl font-extrabold text-stem-900 mb-4 font-display">
            {passed ? 'Félicitations !' : 'Continuez vos efforts !'}
          </h2>

          <div className="text-6xl font-extrabold mb-6" style={{ color: passed ? '#10b981' : '#f97316' }}>
            {score}%
          </div>

          <p className="text-stem-600 text-lg mb-8">
            Vous avez répondu correctement à {questions.filter(q => answers[q.id] === q.correctAnswer).length} sur {questions.length} questions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/dashboard/course/${courseId}/topic/${topicId}`}
              className="btn-3d bg-stem-600 hover:bg-stem-800 text-white font-extrabold py-4 px-8 rounded-xl shadow-button-teal"
            >
              Revoir le topic
            </Link>

            {nextTopicId ? (
              <Link
                href={`/dashboard/course/${courseId}/topic/${nextTopicId}`}
                className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-extrabold py-4 px-8 rounded-xl shadow-button"
              >
                Topic suivant →
              </Link>
            ) : isLastTopicInModule && currentModuleId ? (
              <Link
                href={`/dashboard/course/${courseId}/module/${currentModuleId}/quiz`}
                className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-extrabold py-4 px-8 rounded-xl shadow-button"
              >
                Quiz du module →
              </Link>
            ) : (
              <Link
                href={`/dashboard/course/${courseId}`}
                className="btn-3d bg-accent-500 hover:bg-accent-600 text-white font-extrabold py-4 px-8 rounded-xl shadow-button"
              >
                Retour au cours
              </Link>
            )}
          </div>

          <div className="mt-6">
            <Link
              href="/dashboard"
              className="text-sm text-stem-600 hover:text-stem-900 font-medium transition-colors"
            >
              ← Retour au dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const hasAnswered = answers[currentQ.id] !== undefined;
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/dashboard/course/${courseId}/topic/${topicId}`}
        className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        Retour au topic
      </Link>

      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8 md:p-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-stem-500 uppercase tracking-wider">
              Question {currentQuestion + 1} / {questions.length}
            </span>
            <span className="text-sm font-bold text-accent-600">
              Quiz: {topicTitle}
            </span>
          </div>

          <div className="w-full bg-stem-100 rounded-full h-2 mb-6">
            <div
              className="bg-gradient-to-r from-stem-400 to-accent-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>

          <h2 className="text-2xl font-extrabold text-stem-900 mb-8">{currentQ.question}</h2>

          {currentQ.type === 'mcq' && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all font-medium ${
                    answers[currentQ.id] === index
                      ? 'border-accent-500 bg-accent-50 text-accent-900'
                      : 'border-stem-200 bg-white hover:border-accent-300 hover:bg-accent-50/50 text-stem-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      answers[currentQ.id] === index
                        ? 'border-accent-500 bg-accent-500'
                        : 'border-stem-300 bg-white'
                    }`}>
                      {answers[currentQ.id] === index && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQ.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAnswer(true)}
                className={`p-6 rounded-xl border-2 transition-all font-bold text-lg ${
                  answers[currentQ.id] === true
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-stem-200 bg-white hover:border-green-300 hover:bg-green-50/50 text-stem-900'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    answers[currentQ.id] === true
                      ? 'border-green-500 bg-green-500'
                      : 'border-stem-300 bg-white'
                  }`}>
                    {answers[currentQ.id] === true && (
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span>✓ Vrai</span>
                </div>
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className={`p-6 rounded-xl border-2 transition-all font-bold text-lg ${
                  answers[currentQ.id] === false
                    ? 'border-red-500 bg-red-50 text-red-900'
                    : 'border-stem-200 bg-white hover:border-red-300 hover:bg-red-50/50 text-stem-900'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    answers[currentQ.id] === false
                      ? 'border-red-500 bg-red-500'
                      : 'border-stem-300 bg-white'
                  }`}>
                    {answers[currentQ.id] === false && (
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span>✗ Faux</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-stem-100">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 rounded-xl font-bold text-stem-600 hover:text-stem-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Précédent
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={!hasAnswered}
              className="btn-3d bg-accent-500 hover:bg-accent-600 disabled:bg-gray-300 disabled:shadow-none text-white font-extrabold py-3 px-8 rounded-xl shadow-button transition-all"
            >
              Terminer le quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!hasAnswered}
              className="btn-3d bg-stem-600 hover:bg-stem-800 disabled:bg-gray-300 disabled:shadow-none text-white font-extrabold py-3 px-8 rounded-xl shadow-button-teal transition-all"
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
