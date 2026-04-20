import { NextResponse } from 'next/server';

// Configuration du provider personnalisé (DeepSeek via OpenAI compatible endpoint)
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://ds2api-tau-woad.vercel.app/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ds2api-key-1-your-custom-key';

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

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions') ? DEEPSEEK_API_URL : `${DEEPSEEK_API_URL}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Voici le contenu brut à analyser :\n\n"${text}"\n\nGénère le JSON pur maintenant :` }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();

    if (!response.ok) {
      console.error("API Error Status:", response.status);
      console.error("API Error Body:", rawText);
      return NextResponse.json({ 
        error: `Erreur du proxy Vercel (${response.status}). Consultez les logs.` 
      }, { status: 500 });
    }

    const data = JSON.parse(rawText);
    let generatedContent = data.choices?.[0]?.message?.content || "";

    // Nettoyage manuel au cas où le modèle ajoute quand même des balises markdown
    let cleanJson = generatedContent.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');
    cleanJson = cleanJson.trim();

    try {
      const parsedData = JSON.parse(cleanJson);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Erreur de parsing JSON. Réponse brute de l'IA :", generatedContent);
      return NextResponse.json({ error: "L'IA a retourné un format invalide, veuillez réessayer." }, { status: 500 });
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: "La requête vers DeepSeek a pris trop de temps (Timeout 60s)." }, { status: 504 });
    }
    console.error("Server Fetch Error:", error);
    return NextResponse.json({ error: error.message || 'Erreur de connexion au serveur.' }, { status: 500 });
  }
}
