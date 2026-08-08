import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/reports — Get report data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate dan endDate wajib diisi' }, { status: 400 });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        user: { select: { name: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
            productName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalTransactions = transactions.length;
    const avgTransaction = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const paymentBreakdown = {
      CASH: transactions.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + t.grandTotal, 0),
      TRANSFER: transactions.filter(t => t.paymentMethod === 'TRANSFER').reduce((sum, t) => sum + t.grandTotal, 0),
      QRIS: transactions.filter(t => t.paymentMethod === 'QRIS').reduce((sum, t) => sum + t.grandTotal, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        avgTransaction,
        paymentBreakdown,
        transactions,
      },
    });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
