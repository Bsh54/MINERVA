import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const courseId = params.id;

    // Charger la progression
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Erreur chargement progression:', progressError);
      return NextResponse.json(
        { success: false, error: 'Erreur chargement progression' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: progress || {
        completedTopics: [],
        completedModules: [],
        quizScores: {}
      }
    });

  } catch (error: any) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur: ' + (error.message || '') },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const courseId = params.id;
    const { completedTopics, completedModules, quizScores } = await request.json();

    // Upsert progression
    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        completed_topics: completedTopics,
        completed_modules: completedModules,
        quiz_scores: quizScores,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,course_id'
      });

    if (upsertError) {
      console.error('Erreur sauvegarde progression:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Erreur sauvegarde: ' + upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
