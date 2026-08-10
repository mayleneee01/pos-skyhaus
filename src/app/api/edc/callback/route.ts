import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// This is a public webhook endpoint, NO session check!
// It expects the EDC server to push data here.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transaction_id, status } = body;

    if (!transaction_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Usually you verify a signature/token here to ensure it's actually from the EDC provider
    // For now, we trust the incoming webhook payload

    const mappedStatus = status === 'SUCCESS' ? 'COMPLETED' : 'FAILED';

    const transaction = await prisma.transaction.update({
      where: { id: transaction_id },
      data: { status: mappedStatus },
    });

    return NextResponse.json({ success: true, transactionId: transaction.id, newStatus: transaction.status });
  } catch (error) {
    console.error('EDC Webhook Callback Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
