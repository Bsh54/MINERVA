import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Check session purely from cookie — zero network calls, no timeout risk
function hasSession(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  return cookies.some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && c.value.length > 0
  );
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.includes('/auth/callback')) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);
  const loggedIn = hasSession(request);

  const isDashboard = request.nextUrl.pathname.includes('/dashboard');
  if (isDashboard && !loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  const isAuthPage = request.nextUrl.pathname.includes('/auth');
  if (isAuthPage && loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*', '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
