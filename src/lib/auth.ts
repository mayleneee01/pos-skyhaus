import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const { handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('[AUTH] authorize called, credentials keys:', Object.keys(credentials || {}));

          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing email or password');
            return null;
          }

          console.log('[AUTH] Looking up user:', credentials.email);
          const user = await prisma.user.findUnique({
            where: { email: (credentials.email as string).trim() },
          });

          if (!user) {
            console.log('[AUTH] User not found');
            return null;
          }

          if (!user.isActive) {
            console.log('[AUTH] User not active');
            return null;
          }

          console.log('[AUTH] User found, comparing password...');
          const inputPassword = (credentials.password as string).trim();
          console.log('[AUTH] Password type:', typeof inputPassword, 'length:', inputPassword.length);
          const isPasswordValid = await bcrypt.compare(
            inputPassword,
            user.password
          );

          console.log('[AUTH] Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            return null;
          }

          const result = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
          console.log('[AUTH] Returning user:', JSON.stringify(result));
          return result;
        } catch (error: any) {
          console.error('[AUTH] authorize error:', error.message, error.stack);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string }).role = token.role as string;
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';

export async function auth() {
  try {
    // Next.js 15 requires awaiting cookies(), but for Next.js 14 it's synchronous. 
    // We can use it synchronously but we must handle both if needed.
    // Given the Next.js version, let's just use it safely.
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('authjs.session-token') || cookieStore.get('__Secure-authjs.session-token');
    
    if (!tokenCookie?.value) return null;
    
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!;
    const decoded = await decode({
      token: tokenCookie.value,
      secret,
      salt: 'authjs.session-token'
    });
    
    if (decoded) {
      return { user: decoded };
    }
    return null;
  } catch (error) {
    console.error('Custom auth error:', error);
    return null;
  }
}
