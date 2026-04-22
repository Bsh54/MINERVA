import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Ignorer les requêtes d'API pour éviter les redirections de locale qui causent des erreurs HTML/JSON
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Ignorer les callbacks OAuth pour permettre l'échange du code
  if (request.nextUrl.pathname.includes('/auth/callback')) {
    return NextResponse.next();
  }

  // Initialiser la réponse avec next-intl
  let response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = intlMiddleware(request)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Vérification de la session
  const { data: { user } } = await supabase.auth.getUser()

  // Protection des routes /dashboard
  const isDashboard = request.nextUrl.pathname.includes('/dashboard');
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Protection des routes /auth (Si déjà connecté, on redirige vers dashboard)
  const isAuthPage = request.nextUrl.pathname.includes('/auth');
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response;
}

export const config = {
  // Exclure expressément /api
  matcher: ['/', '/(fr|en)/:path*', '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
