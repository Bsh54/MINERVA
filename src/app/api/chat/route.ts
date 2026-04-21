import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    if (!DEEPSEEK_API_URL || !DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuration API manquante' },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages invalides' },
        { status: 400 }
      );
    }

    const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions')
      ? DEEPSEEK_API_URL
      : `${DEEPSEEK_API_URL}/chat/completions`;

    const response = await axios.post(apiUrl, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for MINERVA, a STEM learning platform. Answer questions clearly and concisely. If asked in French, respond in French. If asked in English, respond in English.'
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Accept-Encoding': 'identity'
      },
      timeout: 30000,
      decompress: false,
      responseType: 'text'
    });

    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    const assistantMessage = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      message: assistantMessage
    });

  } catch (error: any) {
    console.error('Erreur chat API:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    );
  }
}
