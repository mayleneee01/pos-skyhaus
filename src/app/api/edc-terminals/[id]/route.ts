import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PUT: Update data EDC (Hanya Admin)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    const terminal = await (prisma as any).eDCTerminal.update({
      where: { id },
      data: {
        name: body.name,
        bankName: body.bankName,
        terminalId: body.terminalId || null,
        merchantId: body.merchantId || null,
        connectionType: body.connectionType,
        ipAddress: body.ipAddress,
        isActive: body.isActive,
      }
    });

    return NextResponse.json({ success: true, data: terminal });
  } catch (error: any) {
    console.error('Update EDCTerminal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus mesin EDC (Hanya Admin)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    // Optional: check if there are transactions using this EDC before deleting
    // In schema, onDelete: SetNull is set, so it's safe to delete.

    await (prisma as any).eDCTerminal.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete EDCTerminal Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
