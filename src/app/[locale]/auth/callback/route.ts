import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Rediriger vers le dashboard avec la locale
      const redirectUrl = `${origin}/${locale}${next}`;
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Retourner vers la page login en cas d'erreur
  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=AuthCallbackFailed`)
}
