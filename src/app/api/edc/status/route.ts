import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { name: true } }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: transaction.status,
      transaction, // Return full transaction details if frontend needs it for printing
    });
  } catch (error) {
    console.error('EDC Status Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
