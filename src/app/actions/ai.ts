'use server';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://ds2api-tau-woad.vercel.app/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ds2api-key-1-your-custom-key';

export async function generateCourseFromText(text: string) {
  try {
    if (!text || text.trim().length < 10) {
      return { success: false, error: 'Texte fourni trop court ou invalide.' };
    }

    const systemPrompt = `Tu es un professeur expert en STEM. L'étudiant te donne ses notes brutes ou un texte. 
Ton rôle est de générer un PLAN D'ÉTUDE TRÈS DÉTAILLÉ ET EXHAUSTIF, structuré en Modules principaux, contenant chacun plusieurs sous-chapitres (topics) spécifiques. 
L'objectif est que l'étudiant puisse cocher exactement les petites notions qu'il veut réviser.

RÈGLES ABSOLUES : 
1. Tu DOIS répondre UNIQUEMENT avec un objet JSON valide et extrêmement compact (sans espaces inutiles).
2. N'utilise PAS de markdown, pas de \`\`\`json. Renvoie le texte JSON direct.

Format attendu STRICTEMENT :
{"courseTitle":"Titre accrocheur","summary":"Resumé très bref","modules":[{"id":1,"title":"Grand Thème (ex: Cinématique)","estimatedMinutes":20,"topics":[{"id":"1-1","title":"Notion 1 (ex: Vitesse et Accélération)"},{"id":"1-2","title":"Notion 2 (ex: Chute libre)"}]}]}

Génère entre 2 et 4 modules. Chaque module DOIT contenir entre 2 et 4 sous-chapitres (topics) précis. Fais en sorte que le plan soit structuré et détaillé. Ne dépasse pas 800 tokens.`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions') ? DEEPSEEK_API_URL : `${DEEPSEEK_API_URL}/chat/completions`;

    // Utilisation de AbortController avec timeout TRÈS long pour éviter que fetch lâche l'affaire
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes strictes 

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Accept-Encoding': 'identity' // FORCER L'ABSENCE DE COMPRESSION (Anti-bug Next.js)
        },
        cache: 'no-store', // PAS DE CACHE
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Texte à analyser et transformer en plan détaillé :\n"${text}"\n\nGénère le JSON maintenant :` }
          ],
          temperature: 0.6,
          max_tokens: 1500, // Important pour laisser DeepSeek générer un gros JSON détaillé
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();

      if (!response.ok) {
        return { success: false, error: `Erreur DeepSeek: ${response.status} - ${rawText.substring(0, 150)}` };
      }

      const data = JSON.parse(rawText);
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
        return { success: true, data: parsedData };
      } catch (parseError) {
        console.error("Erreur de parsing JSON. Réponse brute:", generatedContent);
        return { success: false, error: "L'IA a généré un format de plan invalide. Réessayez avec un texte plus court." };
      }

    } catch (networkError: any) {
      clearTimeout(timeoutId);
      if (networkError.name === 'AbortError') {
         return { success: false, error: "Le serveur IA a mis trop de temps à répondre (Timeout > 2 min)." };
      }
      throw networkError;
    }

  } catch (error: any) {
    console.error("Erreur de communication IA:", error);
    return { success: false, error: "Erreur lors de la communication avec l'IA. " + (error.message || "") };
  }
}
