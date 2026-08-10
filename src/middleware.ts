import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export default async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // NextAuth internal API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Public webhook routes (EDC)
  if (pathname.startsWith('/api/edc/callback') || pathname.startsWith('/api/edc/mock')) {
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
