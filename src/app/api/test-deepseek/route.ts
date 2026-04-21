import { NextResponse } from 'next/server';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function GET() {
  if (!DEEPSEEK_API_URL || !DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: 'Configuration API manquante' },
      { status: 500 }
    );
  }

  const apiUrl = DEEPSEEK_API_URL.endsWith('/chat/completions') ? DEEPSEEK_API_URL : `${DEEPSEEK_API_URL}/chat/completions`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Accept-Encoding': 'identity'
      },
      cache: 'no-store',
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: 'Ping' }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    const text = await response.text();
    return NextResponse.json({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
