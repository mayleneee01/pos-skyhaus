import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password.trim(), user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Create JWT token matching NextAuth format
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!;
    const token = await encode({
      secret,
      token: {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        id: user.id,
      },
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    const response = NextResponse.json({
      success: true,
      role: user.role,
    });

    // Set session cookie (both prefixed and non-prefixed for compatibility)
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    };

    response.cookies.set('__Secure-authjs.session-token', token, cookieOptions);
    response.cookies.set('authjs.session-token', token, { ...cookieOptions, secure: false });

    return response;
  } catch (error: any) {
    console.error('[LOGIN API] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
