import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PaymentMethod, TransactionStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { items, subtotal, taxRate, taxAmount, grandTotal, paymentMethod, note, edcTerminalId } = body;

    if (!items || !items.length || !grandTotal || !paymentMethod) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Generate Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const invoiceNo = `INV-${dateStr}-${randomCode}`;
    const edcReference = `EDC-${invoiceNo}`; // Generic reference to send to EDC

    // Fetch EDC Terminal Name
    let edcName = null;
    if (edcTerminalId) {
      const edc = await (prisma as any).eDCTerminal.findUnique({ where: { id: edcTerminalId } });
      if (edc) edcName = edc.name;
    }

    // Create transaction as PENDING
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNo,
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMethod: paymentMethod as PaymentMethod,
        status: TransactionStatus.PENDING,
        note,
        edcReference,
        edcTerminalId,
        edcName,
        userId: session.user.id,
        items: {
          create: items.map((item: any) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            productName: item.name,
            productId: item.id,
          })),
        },
      },
    });

    // Determine if we use Sandbox (Mock) or Real EDC
    // For now, always route to our Mock Service for development
    const baseUrl = req.headers.get('host') ? `http://${req.headers.get('host')}` : 'http://localhost:3000';
    
    // Asynchronously call the mock EDC service so we don't block the frontend response
    fetch(`${baseUrl}/api/edc/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_id: transaction.id,
        edc_reference: edcReference,
        amount: grandTotal,
        payment_type: paymentMethod,
        edc_terminal_id: edcTerminalId,
      }),
    }).catch(err => console.error('Failed to trigger mock EDC', err));

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      edcReference,
      message: 'Transaction initiated on EDC',
    });
  } catch (error) {
    console.error('EDC Initiate Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
