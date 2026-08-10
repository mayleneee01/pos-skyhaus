'use server';

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

export async function loginAction(email: string, password: string) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Email atau password salah' };
        default:
          return { success: false, error: 'Terjadi kesalahan, coba lagi' };
      }
    }
    // NextAuth signIn throws NEXT_REDIRECT on success — treat as success
    const digest = (error as any)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return { success: true };
    }
    return { success: false, error: 'Terjadi kesalahan, coba lagi' };
  }
}
