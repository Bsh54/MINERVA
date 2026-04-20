'use server';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://ds2api-tau-woad.vercel.app/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ds2api-key-1-your-custom-key';

export async function generateCourseFromText(text: string) {
  try {
    if (!text || text.trim().length < 10) {
      return { success: false, error: 'Texte fourni trop court ou invalide.' };
    }

    const systemPrompt = `Tu es un professeur expert en STEM. Ton rôle est d'analyser le contenu brut soumis par l'étudiant et de générer un plan de cours structuré en micro-modules pour un apprentissage adaptatif.
    
RÈGLES ABSOLUES : 
1. Tu DOIS répondre UNIQUEMENT avec un objet JSON valide et extrêmement compact.
2. N'utilise PAS de markdown, pas de \`\`\`json. Renvoie le texte JSON direct.

Format attendu STRICTEMENT :
{"courseTitle":"Titre","summary":"Resumé","modules":[{"id":1,"title":"Titre","description":"Description","estimatedMinutes":5}]}
Limite-toi à 3 modules très courts. Ne dépasse pas 200 mots au total.`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions') ? DEEPSEEK_API_URL : `${DEEPSEEK_API_URL}/chat/completions`;

    // Utilisation de fetch en mode Serveur (SANS proxy Next.js / API route HMR)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      // Important pour éviter la mise en cache aggressive des actions Next.js 15
      cache: 'no-store',
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Texte à analyser:\n"${text}"\n\nGénère le JSON maintenant :` }
        ],
        temperature: 0.5,
        max_tokens: 800,
        stream: false
      })
    });

    const rawText = await response.text();

    if (!response.ok) {
      return { success: false, error: `Erreur DeepSeek: ${response.status}` };
    }

    const data = JSON.parse(rawText);
    let generatedContent = data.choices?.[0]?.message?.content || "";

    // Nettoyage Markdown
    let cleanJson = generatedContent.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');
    cleanJson = cleanJson.trim();

    try {
      const parsedData = JSON.parse(cleanJson);
      return { success: true, data: parsedData };
    } catch (parseError) {
      return { success: false, error: "L'IA a généré un texte invalide. Réessayez." };
    }

  } catch (error: any) {
    return { success: false, error: "Erreur lors de la communication avec l'IA." };
  }
}
