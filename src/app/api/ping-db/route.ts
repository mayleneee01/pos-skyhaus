import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ success: true, count, message: 'Database Connected!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: 500 });
  }
}
