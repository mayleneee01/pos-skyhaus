import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as { role: string }).role;
  redirect(role === 'ADMIN' ? '/admin' : '/pos');
}
