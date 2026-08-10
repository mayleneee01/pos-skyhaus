import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware already handles auth redirects:
  // - Logged in ADMIN → /admin
  // - Logged in CASHIER → /pos  
  // - Not logged in → /login
  redirect('/login');
}
