import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { originalText, explanationLevel, additionalSpecs, coursePlan, locale } = await request.json();

    if (!originalText || !coursePlan) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Insérer le cours dans la base de données
    const { data: course, error: insertError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        title: coursePlan.courseTitle,
        summary: coursePlan.summary,
        original_text: originalText,
        explanation_level: explanationLevel,
        additional_specs: additionalSpecs,
        course_plan: coursePlan,
        locale: locale,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur insertion:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la sauvegarde: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      courseId: course.id
    });

  } catch (error: any) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
