'use server';

export async function generateCourseFromText(
  text: string,
  locale: string = 'en',
  explanationLevel: 'simple' | 'detailed' = 'detailed',
  additionalSpecs: string = ''
) {
  try {
    if (!text || text.trim().length < 10) {
      return { success: false, error: 'Texte fourni trop court ou invalide.' };
    }

    // Utiliser l'URL relative pour fonctionner en local et sur Vercel
    const apiUrl = typeof window === 'undefined'
      ? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/generate-course`
      : '/api/generate-course';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, locale, explanationLevel, additionalSpecs }),
      cache: 'no-store'
    });

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error("Erreur de communication IA:", error);
    return { success: false, error: "Erreur lors de la communication avec l'IA. " + (error.message || "") };
  }
}
