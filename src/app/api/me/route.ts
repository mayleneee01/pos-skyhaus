import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('GET /api/me error:', error);
    return NextResponse.json({ success: false, session: null }, { status: 500 });
  }
}
