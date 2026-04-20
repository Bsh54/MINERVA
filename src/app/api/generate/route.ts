import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

// Configuration du provider personnalisé (DeepSeek via OpenAI compatible endpoint)
const deepseek = createOpenAI({
  baseURL: process.env.DEEPSEEK_API_URL || 'https://ds2api-tau-woad.vercel.app/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-ds2api-key-1-your-custom-key',
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: 'Texte fourni trop court ou invalide.' }, { status: 400 });
    }

    const systemPrompt = `Tu es un professeur expert en STEM. Ton rôle est d'analyser le contenu brut soumis par l'étudiant et de générer un plan de cours structuré en micro-modules pour un apprentissage adaptatif.
    
RÈGLES ABSOLUES : 
1. Tu DOIS répondre UNIQUEMENT avec un objet JSON valide.
2. N'ajoute AUCUN texte avant ou après le JSON.
3. N'utilise PAS de balises markdown (comme \`\`\`json). Renvoie le JSON pur.

Le format exact du JSON attendu est :
{
  "courseTitle": "Titre optimisé et engageant du cours",
  "summary": "Bref résumé de ce qui sera appris (2 phrases max)",
  "modules": [
    {
      "id": 1,
      "title": "Titre du module (ex: Les bases)",
      "description": "Ce que l'étudiant va y apprendre (1 phrase)",
      "estimatedMinutes": 10
    }
  ]
}
Assure-toi de générer entre 3 et 5 modules maximum couvrant le contenu fourni.`;

    const { text: generatedText } = await generateText({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: `Voici le contenu brut à analyser :\n\n"${text}"\n\nGénère le JSON pur maintenant :`,
    });

    // Nettoyage manuel au cas où le modèle ajoute quand même des balises markdown
    let cleanJson = generatedText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '');
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.replace(/```$/, '');
    }
    cleanJson = cleanJson.trim();

    try {
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Erreur de parsing JSON. Réponse brute de l'IA :", cleanJson);
      return NextResponse.json({ error: "L'IA a retourné un format invalide, veuillez réessayer." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("DeepSeek API Error:", error);
    return NextResponse.json({ error: error.message || 'Erreur de connexion à l\'API DeepSeek.' }, { status: 500 });
  }
}
