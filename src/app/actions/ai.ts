'use server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

    // Appeler notre API Route interne au lieu de DeepSeek directement
    const response = await fetch(`${API_BASE_URL}/api/generate-course`, {
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
