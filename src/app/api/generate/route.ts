import { NextResponse } from 'next/server';

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
1. Tu DOIS répondre UNIQUEMENT avec un objet JSON valide et extrêmement compact.
2. N'utilise PAS de markdown, pas de \`\`\`json. Renvoie le texte JSON direct.

Format attendu STRICTEMENT :
{"courseTitle":"Titre","summary":"Resumé","modules":[{"id":1,"title":"Titre","description":"Description","estimatedMinutes":5}]}
Limite-toi à 3 modules très courts. Ne dépasse pas 200 mots au total pour éviter les coupures.`;

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions') ? DEEPSEEK_API_URL : `${DEEPSEEK_API_URL}/chat/completions`;

    console.log("Envoi de la requête fetch standard (sans node http) vers:", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Accept': 'application/json',
          // On force Next.js à ne pas utiliser son mécanisme de compression buggé pour ce proxy proxy
          'Accept-Encoding': 'identity'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Texte à analyser:\n"${text}"\n\nGénère le JSON maintenant :` }
          ],
          // On demande explicitement au proxy de NE PAS utiliser le stream interne (cause des coupures)
          stream: false,
          // On limite le nombre de tokens pour éviter que le proxy gratuit ne coupe la réponse en plein milieu
          max_tokens: 800,
          temperature: 0.5
        })
      });

      const rawText = await response.text();

      if (!response.ok) {
        console.error("API Error Status:", response.status);
        console.error("API Error Body:", rawText);
        return NextResponse.json({ 
          error: `Erreur du proxy Vercel (${response.status}).` 
        }, { status: 502 });
      }

      try {
        const data = JSON.parse(rawText);
        
        let generatedContent = data.choices?.[0]?.message?.content || "";

        let cleanJson = generatedContent.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '');
        else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '');
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');
        cleanJson = cleanJson.trim();

        // Réparation basique au cas où le JSON est très légèrement tronqué à la fin
        if (!cleanJson.endsWith('}') && cleanJson.includes('"modules"')) {
           if (!cleanJson.endsWith(']')) cleanJson += ']}';
           else cleanJson += '}';
        }

        const parsedData = JSON.parse(cleanJson);
        return NextResponse.json(parsedData);
      } catch (parseError) {
        console.error("Erreur de parsing JSON. Réponse brute de DeepSeek:", rawText);
        return NextResponse.json({ error: "L'IA a retourné une réponse tronquée. Le texte était peut-être trop long." }, { status: 500 });
      }

    } catch (networkError: any) {
      console.error("Fetch Error:", networkError);
      return NextResponse.json({ error: networkError.message || 'Erreur réseau vers DeepSeek.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Server Route Error:", error);
    return NextResponse.json({ error: 'Erreur inattendue sur le serveur.' }, { status: 500 });
  }
}
