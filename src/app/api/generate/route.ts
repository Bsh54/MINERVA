import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
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

    const result = await generateObject({
      model: deepseek('deepseek-chat'),
      system: "Tu es un professeur expert en STEM. Ton rôle est d'analyser le contenu brut soumis par l'étudiant et de générer un plan de cours structuré en micro-modules pour un apprentissage adaptatif. Reste concis et clair.",
      prompt: `Voici le contenu brut à analyser :\n\n"${text}"\n\nGénère un plan d'étude détaillé en français basé uniquement sur ce contenu.`,
      schema: z.object({
        courseTitle: z.string().describe('Le titre optimisé et engageant du cours généré'),
        summary: z.string().describe('Un bref résumé de ce qui sera appris (2 phrases max)'),
        modules: z.array(
          z.object({
            id: z.number(),
            title: z.string().describe('Titre du module (ex: Les bases de la mécanique)'),
            description: z.string().describe('Ce que l\'étudiant va y apprendre (1 phrase)'),
            estimatedMinutes: z.number().describe('Temps d\'étude estimé en minutes')
          })
        ).describe('Liste ordonnée de 3 à 5 modules maximum couvrant tout le texte'),
      }),
    });

    return NextResponse.json(result.object);
  } catch (error: any) {
    console.error("DeepSeek API Error:", error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la génération du cours.' }, { status: 500 });
  }
}
