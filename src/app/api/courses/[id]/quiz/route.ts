import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    if (!DEEPSEEK_API_URL || !DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuration API manquante' },
        { status: 500 }
      );
    }

    const { targetId, targetType } = await request.json();

    // Vérifier si le quiz existe déjà
    const { data: existingQuiz } = await supabase
      .from('quizzes')
      .select('questions')
      .eq('course_id', courseId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .single();

    if (existingQuiz) {
      console.log(`[CACHE HIT] Quiz trouvé en cache pour ${targetType} ${targetId}`);
      return NextResponse.json({
        success: true,
        questions: existingQuiz.questions
      });
    }

    console.log(`[CACHE MISS] Génération de quiz pour ${targetType} ${targetId}`);

    // Charger le cours
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Cours introuvable' },
        { status: 404 }
      );
    }

    const coursePlan = course.course_plan;
    let targetTitle = '';
    let context = '';

    if (targetType === 'topic') {
      for (const module of coursePlan.modules) {
        const topic = module.topics.find((t: any) => t.id === targetId);
        if (topic) {
          targetTitle = topic.title;
          context = `Topic: ${topic.title} from Module: ${module.title}`;
          break;
        }
      }
    } else {
      const module = coursePlan.modules.find((m: any) => m.id.toString() === targetId);
      if (module) {
        targetTitle = module.title;
        context = `Module: ${module.title} with topics: ${module.topics.map((t: any) => t.title).join(', ')}`;
      }
    }

    if (!targetTitle) {
      return NextResponse.json(
        { success: false, error: 'Cible introuvable' },
        { status: 404 }
      );
    }

    // Générer le quiz avec DeepSeek
    const languageInstruction = course.locale === 'fr'
      ? 'Tu DOIS répondre en FRANÇAIS.'
      : 'You MUST respond in ENGLISH.';

    const quizTypeInstruction = targetType === 'topic'
      ? 'Generate 5 questions: 3 multiple choice (MCQ) and 2 true/false questions.'
      : 'Generate 7 more complex questions: 5 multiple choice with detailed options and 2 true/false questions.';

    const systemPrompt = `You are an expert STEM teacher creating quiz questions.

${languageInstruction}
${quizTypeInstruction}

RULES:
1. Questions must test understanding, not just memorization
2. For MCQ: provide 4 options, only one correct
3. Questions should be clear and unambiguous
4. Difficulty appropriate for BEGINNERS
5. Return ONLY valid JSON, no markdown

Format:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  },
  {
    "id": "q2",
    "type": "true-false",
    "question": "Statement to evaluate?",
    "correctAnswer": true
  }
]`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions')
      ? DEEPSEEK_API_URL
      : `${DEEPSEEK_API_URL}/chat/completions`;

    const response = await axios.post(apiUrl, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Course: ${coursePlan.courseTitle}\n${context}\n\nOriginal content:\n${course.original_text}\n\nGenerate quiz questions:` }
      ],
      temperature: 0.8,
      max_tokens: 1200,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Accept-Encoding': 'identity'
      },
      timeout: 120000,
      decompress: false,
      responseType: 'text'
    });

    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    let generatedContent = data.choices?.[0]?.message?.content || "";

    // Nettoyage markdown
    let cleanJson = generatedContent.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');
    cleanJson = cleanJson.trim();

    const questions = JSON.parse(cleanJson);

    // Sauvegarder le quiz
    const { error: insertError } = await supabase
      .from('quizzes')
      .insert({
        course_id: courseId,
        target_id: targetId,
        target_type: targetType,
        questions: questions
      });

    if (insertError) {
      console.error('[ERREUR SAUVEGARDE] Impossible de sauvegarder le quiz:', insertError);
      // On retourne quand même le quiz même si la sauvegarde échoue
    } else {
      console.log(`[SAUVEGARDE OK] Quiz sauvegardé pour ${targetType} ${targetId}`);
    }

    return NextResponse.json({
      success: true,
      questions
    });

  } catch (error: any) {
    console.error('Erreur génération quiz:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur génération quiz: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
