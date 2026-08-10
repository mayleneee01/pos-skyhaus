import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Ambil daftar semua EDC (Admin & Kasir)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const whereClause = activeOnly ? { isActive: true } : {};

    const terminals = await (prisma as any).eDCTerminal.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: terminals });
  } catch (error: any) {
    console.error('Fetch EDCTerminals Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah EDC baru (Hanya Admin)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, bankName, terminalId, merchantId, connectionType, ipAddress, isActive } = body;

    if (!name || !bankName || !ipAddress) {
      return NextResponse.json({ success: false, error: 'Name, Bank Name, dan IP Address wajib diisi' }, { status: 400 });
    }

    const terminal = await (prisma as any).eDCTerminal.create({
      data: {
        name,
        bankName,
        terminalId: terminalId || null,
        merchantId: merchantId || null,
        connectionType: connectionType || 'API',
        ipAddress,
        isActive: isActive !== undefined ? isActive : true,
      }
    });

    return NextResponse.json({ success: true, data: terminal });
  } catch (error: any) {
    console.error('Create EDCTerminal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
