import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, sku, price, stock, lowStock, image, categoryId, isActive } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku: (sku && sku.trim() !== '') ? sku.trim() : null }),
        ...(price !== undefined && { price: parseInt(price) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(lowStock !== undefined && { lowStock: parseInt(lowStock) }),
        ...(image !== undefined && { image }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('PUT /api/products/[id] error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Kode SKU sudah digunakan oleh produk lain' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if product has transactions — soft delete if so
    const hasTransactions = await prisma.transactionItem.findFirst({
      where: { productId: id },
    });

    if (hasTransactions) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, message: 'Produk dinonaktifkan (memiliki riwayat transaksi)' });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
