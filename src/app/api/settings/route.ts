import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/settings — Get store settings
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.storeSetting.findFirst();

    if (!settings) {
      settings = await prisma.storeSetting.create({
        data: {
          storeName: 'SKY HAUS',
          address: 'Jl. Lapas, Kec. Jati Agung, Lampung',
          phone: '0857-1952-1461',
          taxRate: 0,
          receiptFooter: 'Terima Kasih Atas Kunjungan Anda!',
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/settings — Update store settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { storeName, address, phone, taxRate, qrisImage, receiptFooter } = body;

    let settings = await prisma.storeSetting.findFirst();

    if (settings) {
      settings = await prisma.storeSetting.update({
        where: { id: settings.id },
        data: {
          ...(storeName !== undefined && { storeName }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
          ...(qrisImage !== undefined && { qrisImage }),
          ...(receiptFooter !== undefined && { receiptFooter }),
        },
      });
    } else {
      settings = await prisma.storeSetting.create({
        data: {
          storeName: storeName || 'SKY HAUS',
          address: address || 'Jl. Lapas, Kec. Jati Agung, Lampung',
          phone: phone || '0857-1952-1461',
          taxRate: parseFloat(taxRate) || 0,
          qrisImage: qrisImage || null,
          receiptFooter: receiptFooter || 'Terima Kasih Atas Kunjungan Anda!',
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
