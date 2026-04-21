import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Pré-génère les 3 premiers topics d'un cours
 * Appelé automatiquement après la création du plan
 */
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

    // Collecter les 3 premiers topics
    const firstTopics: Array<{ topicId: string; topicTitle: string; moduleTitle: string }> = [];

    for (const module of coursePlan.modules) {
      for (const topic of module.topics) {
        if (firstTopics.length < 3) {
          firstTopics.push({
            topicId: topic.id,
            topicTitle: topic.title,
            moduleTitle: module.title
          });
        }
        if (firstTopics.length >= 3) break;
      }
      if (firstTopics.length >= 3) break;
    }

    const results = [];
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

Remember: DOUBLE line breaks everywhere, generous use of **bold**, clear structure with headers.`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions')
      ? DEEPSEEK_API_URL
      : `${DEEPSEEK_API_URL}/chat/completions`;

    // Générer les topics 2 par 2 avec délai
    for (let i = 0; i < firstTopics.length; i += 2) {
      const batch = firstTopics.slice(i, i + 2);
      const batchPromises = batch.map(async ({ topicId, topicTitle, moduleTitle }) => {
        try {
          // Vérifier si déjà généré
          const { data: existing } = await supabase
            .from('topic_explanations')
            .select('explanation')
            .eq('course_id', courseId)
            .eq('topic_id', topicId)
            .single();

          if (existing) {
            return { topicId, success: true, cached: true };
          }

          // Générer avec retry
          let attempts = 0;
          let lastError = null;

          while (attempts < 3) {
            try {
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

              // Sauvegarder
              await supabase
                .from('topic_explanations')
                .insert({
                  course_id: courseId,
                  topic_id: topicId,
                  explanation: explanation.trim()
                });

              return { topicId, success: true, cached: false };
            } catch (error: any) {
              lastError = error;
              attempts++;

              // Si rate limit, attendre plus longtemps
              if (error.response?.status === 429 || error.response?.status === 401) {
                await new Promise(resolve => setTimeout(resolve, 5000 * attempts));
              } else {
                break; // Autre erreur, pas la peine de retry
              }
            }
          }

          return { topicId, success: false, error: lastError?.message };
        } catch (error: any) {
          return { topicId, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Délai entre les batchs (sauf le dernier)
      if (i + 2 < firstTopics.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const cachedCount = results.filter(r => r.cached).length;

    return NextResponse.json({
      success: true,
      generated: successCount - cachedCount,
      cached: cachedCount,
      failed: results.length - successCount,
      results
    });

  } catch (error: any) {
    console.error('Erreur pré-génération:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur pré-génération: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
