import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
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
            where: { email: credentials.email as string },
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
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
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
