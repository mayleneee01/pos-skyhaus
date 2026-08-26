import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/products — Get all products with category
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const products = await prisma.product.findMany({
      where: {
        ...(activeOnly && { isActive: true }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [
        { isFavorite: 'desc' },
        { category: { order: 'asc' } },
        { name: 'asc' }
      ],
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/products — Create a new product
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sku, price, stock, lowStock, image, categoryId } = body;

    if (!name || !price || !categoryId) {
      return NextResponse.json({ success: false, error: 'Nama, harga, dan kategori wajib diisi' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: (sku && sku.trim() !== '') ? sku.trim() : null,
        price: parseInt(price),
        stock: parseInt(stock) || 0,
        lowStock: parseInt(lowStock) || 5,
        image: image || null,
        categoryId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/products error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Kode SKU sudah digunakan oleh produk lain' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message || String(error)}` }, { status: 500 });
  }
}
