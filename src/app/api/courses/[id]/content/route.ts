import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://ds2api-tau-woad.vercel.app/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ds2api-key-1-your-custom-key';

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
    const { topicId } = await request.json();

    // Vérifier si l'explication existe déjà
    const { data: existingExplanation } = await supabase
      .from('topic_explanations')
      .select('explanation')
      .eq('course_id', courseId)
      .eq('topic_id', topicId)
      .single();

    if (existingExplanation) {
      return NextResponse.json({
        success: true,
        explanation: existingExplanation.explanation
      });
    }

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

    // Trouver le topic dans le plan
    const coursePlan = course.course_plan;
    let topicTitle = '';
    let moduleTitle = '';

    for (const module of coursePlan.modules) {
      const topic = module.topics.find((t: any) => t.id === topicId);
      if (topic) {
        topicTitle = topic.title;
        moduleTitle = module.title;
        break;
      }
    }

    if (!topicTitle) {
      return NextResponse.json(
        { success: false, error: 'Topic introuvable' },
        { status: 404 }
      );
    }

    // Générer l'explication avec DeepSeek
    const languageInstruction = course.locale === 'fr'
      ? 'Tu DOIS répondre en FRANÇAIS.'
      : 'You MUST respond in ENGLISH.';

    const systemPrompt = `You are an expert STEM teacher. Generate a clear, detailed explanation for a specific topic.

${languageInstruction}

RULES:
1. Explain the concept in a way that a BEGINNER can understand
2. Use simple language and concrete examples
3. Break down complex ideas into digestible parts
4. Include practical applications when relevant
5. Keep the explanation between 300-500 words
6. Do NOT use markdown formatting, just plain text with line breaks`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions')
      ? DEEPSEEK_API_URL
      : `${DEEPSEEK_API_URL}/chat/completions`;

    const response = await axios.post(apiUrl, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Course: ${coursePlan.courseTitle}\nModule: ${moduleTitle}\nTopic: ${topicTitle}\n\nOriginal context:\n${course.original_text}\n\nGenerate a detailed explanation for this topic:` }
      ],
      temperature: 0.7,
      max_tokens: 800,
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
    const explanation = data.choices?.[0]?.message?.content || "";

    // Sauvegarder l'explication
    await supabase
      .from('topic_explanations')
      .insert({
        course_id: courseId,
        topic_id: topicId,
        explanation: explanation.trim()
      });

    return NextResponse.json({
      success: true,
      explanation: explanation.trim()
    });

  } catch (error: any) {
    console.error('Erreur génération contenu:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur génération: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
