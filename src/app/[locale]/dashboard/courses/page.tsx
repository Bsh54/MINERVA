import { createClient } from '@/utils/supabase/server';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, Clock, BookOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Dashboard');

  // Charger les cours de l'utilisateur
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, summary, created_at, course_plan')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  // Charger la progression pour chaque cours
  const coursesWithProgress = await Promise.all(
    (courses || []).map(async (course) => {
      const { data: progress } = await supabase
        .from('user_progress')
        .select('completed_topics')
        .eq('user_id', user?.id)
        .eq('course_id', course.id)
        .single();

      const totalTopics = course.course_plan.modules.reduce(
        (acc: number, mod: any) => acc + (mod.topics?.length || 0),
        0
      );
      const completedCount = progress?.completed_topics?.length || 0;
      const progressPercent = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;

      return {
        ...course,
        totalTopics,
        completedCount,
        progressPercent
      };
    })
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        {t('backHub')}
      </Link>

      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-stem-900 font-display mb-3">{t('myCourses')}</h1>
        <p className="text-stem-600 text-lg font-medium">Reprenez votre apprentissage là où vous l'avez laissé.</p>
      </header>

      {coursesWithProgress.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-stem-300 mx-auto mb-4" />
          <p className="text-stem-500 text-lg mb-6">Vous n'avez pas encore de cours.</p>
          <Link
            href="/dashboard/create"
            className="btn-3d bg-stem-600 hover:bg-stem-800 text-white font-extrabold py-3 px-8 rounded-xl shadow-button-teal inline-flex items-center gap-2"
          >
            Créer mon premier cours
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coursesWithProgress.map((course) => {
            const isComplete = course.progressPercent === 100;
            const createdDate = new Date(course.created_at);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

            let timeLabel = '';
            if (diffDays === 0) timeLabel = "Aujourd'hui";
            else if (diffDays === 1) timeLabel = "Hier";
            else timeLabel = `Il y a ${diffDays} jours`;

            return (
              <Link
                key={course.id}
                href={`/dashboard/course/${course.id}`}
                className="bg-white rounded-3xl p-8 border border-stem-100 shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm relative z-10 ${
                  isComplete
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-stem-50 text-stem-600 border border-stem-200'
                }`}>
                  <BookOpen className="w-7 h-7" />
                </div>

                <h3 className="text-xl font-extrabold text-stem-900 mb-2 relative z-10 line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-sm text-stem-500 font-medium mb-6 flex items-center gap-2 relative z-10">
                  <Clock className="w-4 h-4" /> {timeLabel}
                </p>

                <div className="w-full bg-stem-50 rounded-full h-2.5 mb-3 overflow-hidden relative z-10">
                  <div
                    className={`h-2.5 rounded-full ${
                      isComplete
                        ? 'bg-gradient-to-r from-green-400 to-green-600'
                        : 'bg-gradient-to-r from-stem-400 to-stem-600'
                    }`}
                    style={{ width: `${course.progressPercent}%` }}
                  ></div>
                </div>

                <p className={`text-xs text-right font-bold uppercase tracking-wide relative z-10 ${
                  isComplete ? 'text-green-600' : 'text-stem-400'
                }`}>
                  {isComplete ? 'Terminé 🎉' : `${Math.round(course.progressPercent)}% complété`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
