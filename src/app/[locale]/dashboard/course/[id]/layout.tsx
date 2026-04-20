import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { CourseProvider } from '@/contexts/CourseContext';

export default async function CourseLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Charger le cours
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !course) {
    redirect('/dashboard');
  }

  const courseData = {
    id: course.id,
    title: course.title,
    summary: course.summary,
    coursePlan: course.course_plan,
    locale: course.locale
  };

  return (
    <CourseProvider courseData={courseData}>
      {children}
    </CourseProvider>
  );
}
