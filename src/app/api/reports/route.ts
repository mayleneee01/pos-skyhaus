import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getWibRangeFromDateString } from '@/lib/utils';

// GET /api/reports — Get report data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'ADMIN' && userRole !== 'CASHIER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate dan endDate wajib diisi' }, { status: 400 });
    }

    const { start } = getWibRangeFromDateString(startDate);
    const { end } = getWibRangeFromDateString(endDate);

    const transactions = await prisma.transaction.findMany({
      where: {
        status: { in: ['COMPLETED', 'VOIDED', 'UNPAID'] },
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

    // Only count COMPLETED transactions for financial totals
    const completedTx = transactions.filter(t => t.status === 'COMPLETED');
    const totalRevenue = completedTx.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalTransactions = completedTx.length;
    const avgTransaction = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const paymentBreakdown = {
      CASH: {
        amount: completedTx.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + t.grandTotal, 0),
        count: completedTx.filter(t => t.paymentMethod === 'CASH').length
      },
      TRANSFER: {
        amount: completedTx.filter(t => t.paymentMethod === 'TRANSFER').reduce((sum, t) => sum + t.grandTotal, 0),
        count: completedTx.filter(t => t.paymentMethod === 'TRANSFER').length
      },
      QRIS: {
        amount: completedTx.filter(t => t.paymentMethod === 'QRIS').reduce((sum, t) => sum + t.grandTotal, 0),
        count: completedTx.filter(t => t.paymentMethod === 'QRIS').length
      },
      QRIS_EDC: {
        amount: completedTx.filter(t => t.paymentMethod === 'QRIS_EDC').reduce((sum, t) => sum + t.grandTotal, 0),
        count: completedTx.filter(t => t.paymentMethod === 'QRIS_EDC').length
      },
    };

    const edcBreakdown = completedTx
      .filter(t => t.paymentMethod === 'QRIS_EDC' && t.edcName)
      .reduce((acc, t) => {
        if (!t.edcName) return acc;
        if (!acc[t.edcName]) acc[t.edcName] = { amount: 0, count: 0 };
        acc[t.edcName].amount += t.grandTotal;
        acc[t.edcName].count += 1;
        return acc;
      }, {} as Record<string, { amount: number, count: number }>);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        avgTransaction,
        paymentBreakdown,
        edcBreakdown,
        transactions,
      },
    });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
