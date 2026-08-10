import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateInvoiceNo, getTodayRange } from '@/lib/utils';

// GET /api/transactions — Get transactions with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const todayOnly = searchParams.get('todayOnly') === 'true';

    let dateFilter = {};
    if (todayOnly) {
      const { start, end } = getTodayRange();
      dateFilter = { createdAt: { gte: start, lte: end } };
    } else if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      };
    }

    // Kasir hanya bisa lihat transaksi hari ini
    const userRole = (session.user as { role: string }).role;
    if (userRole === 'CASHIER') {
      const { start, end } = getTodayRange();
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        ...dateFilter,
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

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/transactions — Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, subtotal, taxRate, taxAmount, grandTotal, paymentMethod, cashReceived, changeAmount, note } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Keranjang kosong' }, { status: 400 });
    }

    if (!paymentMethod || !['CASH', 'TRANSFER', 'QRIS'].includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Metode pembayaran tidak valid' }, { status: 400 });
    }

    // Validate stock availability
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ success: false, error: `Produk "${item.name || item.productName}" tidak ditemukan` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({
          success: false,
          error: `Stok "${product.name}" tidak cukup (tersedia: ${product.stock})`
        }, { status: 400 });
      }
    }

    // Generate invoice number
    const { start, end } = getTodayRange();
    const todayCount = await prisma.transaction.count({
      where: { createdAt: { gte: start, lte: end } },
    });
    const invoiceNo = generateInvoiceNo(todayCount + 1);

    // Create transaction in a database transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction
      const newTransaction = await tx.transaction.create({
        data: {
          invoiceNo,
          subtotal,
          taxRate: taxRate || 0,
          taxAmount: taxAmount || 0,
          grandTotal,
          paymentMethod,
          status: 'COMPLETED',
          cashReceived: cashReceived || null,
          changeAmount: changeAmount || null,
          note: note || null,
          userId: session.user.id as string,
          items: {
            create: items.map((item: { productId: string; quantity: number; unitPrice: number; name?: string; productName?: string }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              productName: item.name || item.productName || 'Unknown Product',
            })),
          },
        },
        include: {
          user: { select: { name: true } },
          items: true,
        },
      });

      // 2. Reduce stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newTransaction;
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    console.error('POST /api/transactions error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
