import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export default async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret });
  // Map token to session-like structure for the existing logic
  const session = token ? { user: { role: token.role } } : null;
  const { pathname } = request.nextUrl;

  // NextAuth internal API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Public webhook routes (EDC & Diagnostic)
  if (
    pathname.startsWith('/api/edc/callback') ||
    pathname.startsWith('/api/edc/mock') ||
    pathname.startsWith('/api/ping-db') ||
    pathname.startsWith('/api/test-auth')
  ) {
    return NextResponse.next();
  }

  // Public routes (Login)
  if (pathname.startsWith('/login')) {
    if (session) {
      const role = (session.user as { role: string }).role;
      const redirectUrl = role === 'ADMIN' ? '/admin' : '/pos';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // Root path — redirect to dashboard or login
  if (pathname === '/') {
    if (session) {
      const role = (session.user as { role: string }).role;
      const redirectUrl = role === 'ADMIN' ? '/admin' : '/pos';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protected routes — redirect to login if not authenticated
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = (session.user as { role: string }).role;

  // Admin routes — only ADMIN role
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/pos', request.url));
  }

  // POS routes — ADMIN and CASHIER
  if (pathname.startsWith('/pos') && !['ADMIN', 'CASHIER'].includes(userRole)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-sky-haus.png|uploads/).*)'],
};
