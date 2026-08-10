'use server';

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

export async function loginAction(email: string, password: string) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Email atau password salah' };
        default:
          return { success: false, error: 'Terjadi kesalahan, coba lagi' };
      }
    }
    // Next.js redirect throws an error that we need to re-throw
    throw error;
  }
  return { success: true };
}
