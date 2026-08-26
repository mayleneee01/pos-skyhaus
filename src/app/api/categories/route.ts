import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/categories — Get all categories
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/categories — Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, order } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Kategori sudah ada' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: { 
        name,
        order: parseInt(order) || 0
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
