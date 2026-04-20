import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://ds2api-tau-woad.vercel.app/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ds2api-key-1-your-custom-key';

export async function POST(request: NextRequest) {
  try {
    const { text, locale = 'en', explanationLevel = 'detailed', additionalSpecs = '' } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Texte fourni trop court ou invalide.' },
        { status: 400 }
      );
    }

    const languageInstruction = locale === 'fr'
      ? 'Tu DOIS répondre en FRANÇAIS.'
      : 'You MUST respond in ENGLISH.';

    const levelInstruction = explanationLevel === 'simple'
      ? (locale === 'fr'
          ? 'Crée un plan CONCIS et SYNTHÉTIQUE avec 2-4 modules maximum et 3-5 topics par module. Reste bref et va à l\'essentiel. IMPORTANT: L\'étudiant est DÉBUTANT, explique chaque concept de manière accessible.'
          : 'Create a CONCISE and SYNTHETIC plan with 2-4 modules maximum and 3-5 topics per module. Keep it brief and to the point. IMPORTANT: The student is a BEGINNER, explain each concept in an accessible way.')
      : (locale === 'fr'
          ? 'Crée un plan TRÈS DÉTAILLÉ ET EXHAUSTIF avec autant de modules et topics que nécessaire (pas de limite - 5, 10, 15+ modules si le contenu est riche). Sois GRANULAIRE et décompose en profondeur. IMPORTANT: L\'étudiant est DÉBUTANT, décompose chaque concept complexe en petites notions simples et progressives.'
          : 'Create a VERY DETAILED AND EXHAUSTIVE plan with as many modules and topics as necessary (no limit - 5, 10, 15+ modules if content is rich). Be GRANULAR and break down in depth. IMPORTANT: The student is a BEGINNER, break down each complex concept into small simple and progressive notions.');

    const additionalContext = additionalSpecs.trim()
      ? (locale === 'fr'
          ? `\n\nINSTRUCTIONS SUPPLÉMENTAIRES DE L'UTILISATEUR:\n${additionalSpecs}`
          : `\n\nADDITIONAL USER INSTRUCTIONS:\n${additionalSpecs}`)
      : '';

    const systemPrompt = `You are an expert STEM teacher. The student provides raw notes or text.
Your role is to generate a STUDY PLAN structured in main Modules, each containing several specific sub-chapters (topics).
The goal is for the student to check exactly the small concepts they want to review.

${languageInstruction}
${levelInstruction}
${additionalContext}

ABSOLUTE RULES:
1. You MUST respond ONLY with a valid and extremely compact JSON object (no unnecessary spaces).
2. Do NOT use markdown, no \`\`\`json. Return direct JSON text.
3. Analyze the provided content and adapt the number of modules and topics based on the explanation level chosen.
4. Be GRANULAR: break down complex concepts into small precise and actionable notions.

STRICTLY expected format:
{"courseTitle":"Catchy title","summary":"Very brief summary","modules":[{"id":1,"title":"Main Theme (e.g., Kinematics)","estimatedMinutes":20,"topics":[{"id":"1-1","title":"Notion 1 (e.g., Speed and Acceleration)"},{"id":"1-2","title":"Notion 2 (e.g., Free Fall)"}]}]}

Adapt the number of modules and topics to the RICHNESS and COMPLEXITY of the provided content AND the explanation level requested.`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions')
      ? DEEPSEEK_API_URL
      : `${DEEPSEEK_API_URL}/chat/completions`;

    const response = await axios.post(apiUrl, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Text to analyze and transform into detailed plan:\n"${text}"\n\nGenerate the JSON now:` }
      ],
      temperature: 0.6,
      max_tokens: 1500,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Accept-Encoding': 'identity' // Demander une réponse NON compressée
      },
      timeout: 120000,
      decompress: false, // Ne pas décompresser automatiquement
      responseType: 'text' // Lire comme texte brut
    });

    // Parser la réponse texte en JSON
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    let generatedContent = data.choices?.[0]?.message?.content || "";

    // Nettoyage Markdown
    let cleanJson = generatedContent.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');
    cleanJson = cleanJson.trim();

    // Auto-réparation basique si le json coupe net à la fin
    if (!cleanJson.endsWith('}') && cleanJson.includes('"modules"')) {
      if (!cleanJson.endsWith(']')) cleanJson += ']}';
      else cleanJson += '}';
    }

    try {
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, data: parsedData });
    } catch (parseError) {
      console.error("Erreur de parsing JSON. Réponse brute:", generatedContent);
      return NextResponse.json(
        { success: false, error: "L'IA a généré un format de plan invalide. Réessayez avec un texte plus court." },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Erreur de communication IA:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la communication avec l'IA. " + (error.message || "") },
      { status: 500 }
    );
  }
}
