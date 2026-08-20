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

    // Get current transaction to ensure we only process PENDING ones
    const existingTx = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      include: { items: true },
    });

    if (!existingTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (existingTx.status !== 'PENDING') {
      return NextResponse.json({ success: true, message: 'Transaction already processed' });
    }

    // Update transaction status
    const transaction = await prisma.transaction.update({
      where: { id: transaction_id },
      data: { status: mappedStatus },
    });

    // If successful, decrease stock
    if (mappedStatus === 'COMPLETED') {
      for (const item of existingTx.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return NextResponse.json({ success: true, transactionId: transaction.id, newStatus: transaction.status });
  } catch (error) {
    console.error('EDC Webhook Callback Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
