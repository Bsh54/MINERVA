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

    const { topicId } = await request.json();

    // Vérifier si l'explication existe déjà
    const { data: existingExplanation } = await supabase
      .from('topic_explanations')
      .select('explanation')
      .eq('course_id', courseId)
      .eq('topic_id', topicId)
      .single();

    if (existingExplanation) {
      console.log(`[CACHE HIT] Explication trouvée en cache pour topic ${topicId}`);
      return NextResponse.json({
        success: true,
        explanation: existingExplanation.explanation
      });
    }

    console.log(`[CACHE MISS] Génération d'explication pour topic ${topicId}`);

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

    const systemPrompt = `You are an expert STEM teacher. Generate a clear, engaging explanation for a specific topic.

${languageInstruction}

CRITICAL FORMATTING RULES:
1. NEVER use emojis (no 📌 💡 ⚠️ or any emoji)
2. Use DOUBLE line breaks between ALL paragraphs (press Enter twice)
3. Use DOUBLE line breaks before and after lists
4. Use DOUBLE line breaks before and after blockquotes
5. Use DOUBLE line breaks before and after headers

CONTENT RULES:
1. Explain the concept in a way that a BEGINNER can understand
2. Use simple language and concrete examples
3. Break down complex ideas into digestible parts
4. Include practical applications when relevant
5. Keep the explanation between 500-700 words

MARKDOWN FORMATTING:
- Use **bold** for key concepts and important terms (use it generously)
- Use *italic* for emphasis
- Use > blockquotes for important notes, tips, or warnings
- Use bullet points (- ) for lists
- Use numbered lists (1. 2. 3.) for steps or sequences
- Use ### for section headers
- Use \`code\` for formulas, equations, or technical terms

STRUCTURE (with proper spacing):
1. ### Introduction
   - Simple definition (1 paragraph)
   - Double line break

2. ### Pourquoi c'est important
   - Real-world context and applications (1-2 paragraphs)
   - Double line break

3. ### Comment ça fonctionne
   - Step-by-step breakdown (use numbered list or paragraphs)
   - Double line break

4. ### Exemples concrets
   - 1-2 concrete examples with details
   - Double line break

5. > Important note or key takeaway in blockquote

EXAMPLE OF PROPER SPACING:
### Introduction

Le **concept X** est une notion fondamentale en mathématiques.

### Pourquoi c'est important

Ce concept permet de résoudre des problèmes réels.

- Application 1
- Application 2

### Comment ça fonctionne

1. Première étape
2. Deuxième étape

> Note importante : Toujours vérifier vos calculs.

Remember: DOUBLE line breaks everywhere, generous use of **bold**, clear structure with headers.`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions')
      ? DEEPSEEK_API_URL
      : `${DEEPSEEK_API_URL}/chat/completions`;

    const response = await axios.post(apiUrl, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Course: ${coursePlan.courseTitle}\nModule: ${moduleTitle}\nTopic: ${topicTitle}\n\nOriginal context:\n${course.original_text}\n\nGenerate an engaging, well-formatted explanation for this topic:` }
      ],
      temperature: 0.7,
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
    const explanation = data.choices?.[0]?.message?.content || "";

    // Sauvegarder l'explication
    const { error: insertError } = await supabase
      .from('topic_explanations')
      .insert({
        course_id: courseId,
        topic_id: topicId,
        explanation: explanation.trim()
      });

    if (insertError) {
      console.error('[ERREUR SAUVEGARDE] Impossible de sauvegarder l\'explication:', insertError);
      // On retourne quand même l'explication même si la sauvegarde échoue
    } else {
      console.log(`[SAUVEGARDE OK] Explication sauvegardée pour topic ${topicId}`);
    }

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
