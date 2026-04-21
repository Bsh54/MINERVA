'use client';

import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCourse } from '@/contexts/CourseContext';

interface Question {
  id: string;
  type: 'mcq' | 'true-false' | 'open';
  question: string;
  options?: string[];
  correctAnswer: string | number;
}

interface QuizModalProps {
  targetId: string;
  targetType: 'topic' | 'module';
  title: string;
  onClose: () => void;
}

export default function QuizModal({ targetId, targetType, title, onClose }: QuizModalProps) {
  const { course, saveQuizScore } = useCourse();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    try {
      const response = await fetch(`/api/courses/${course?.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, targetType })
      });

      const data = await response.json();

      if (data.success && data.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Erreur chargement quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const finalScore = (correctCount / questions.length) * 100;
    setScore(finalScore);
    setShowResults(true);
    saveQuizScore(`${targetType}-${targetId}`, finalScore);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12">
          <Loader2 className="w-12 h-12 text-accent-500 animate-spin mx-auto mb-4" />
          <p className="text-stem-600 font-medium">Génération du quiz...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
            score >= 70 ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {score >= 70 ? (
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>

          <h3 className="text-3xl font-extrabold text-stem-900 mb-2">
            {score >= 70 ? 'Bravo !' : 'Continuez !'}
          </h3>
          <p className="text-stem-600 mb-6">
            Vous avez obtenu <strong>{Math.round(score)}%</strong>
          </p>

          <button
            onClick={onClose}
            className="btn-3d bg-stem-600 hover:bg-stem-800 text-white font-extrabold py-3 px-8 rounded-xl shadow-button-teal transition-all w-full"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isAnswered = answers[question?.id] !== undefined;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stem-100">
          <div>
            <h2 className="text-2xl font-extrabold text-stem-900 font-display">{title}</h2>
            <p className="text-sm text-stem-500 mt-1">
              Question {currentQuestion + 1} / {questions.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stem-400 hover:text-stem-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-stem-50 h-2">
          <div
            className="bg-gradient-to-r from-accent-400 to-accent-600 h-2 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xl font-bold text-stem-900 mb-6">{question?.question}</h3>

          {question?.type === 'mcq' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(question.id, idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[question.id] === idx
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-stem-200 hover:border-stem-400 bg-white'
                  }`}
                >
                  <span className="font-medium text-stem-900">{option}</span>
                </button>
              ))}
            </div>
          )}

          {question?.type === 'true-false' && (
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer(question.id, true)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[question.id] === true
                    ? 'border-green-500 bg-green-50'
                    : 'border-stem-200 hover:border-stem-400 bg-white'
                }`}
              >
                <span className="font-bold text-stem-900">✓ Vrai</span>
              </button>
              <button
                onClick={() => handleAnswer(question.id, false)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[question.id] === false
                    ? 'border-red-500 bg-red-50'
                    : 'border-stem-200 hover:border-stem-400 bg-white'
                }`}
              >
                <span className="font-bold text-stem-900">✗ Faux</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-stem-100">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 rounded-xl font-bold border-2 border-stem-200 text-stem-600 hover:bg-stem-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Précédent
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isAnswered}
              className="btn-3d bg-stem-600 hover:bg-stem-800 disabled:bg-gray-300 text-white font-extrabold py-3 px-8 rounded-xl shadow-button-teal transition-all"
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== questions.length}
              className="btn-3d bg-accent-500 hover:bg-accent-600 disabled:bg-gray-300 text-white font-extrabold py-3 px-8 rounded-xl shadow-button transition-all"
            >
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
