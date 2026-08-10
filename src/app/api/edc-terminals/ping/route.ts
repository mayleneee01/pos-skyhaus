import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { ipAddress } = await request.json();

    if (!ipAddress) {
      return NextResponse.json({ success: false, error: 'IP Address wajib diisi' }, { status: 400 });
    }

    // Mock ping: sleep for 1 second to simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success if IP address looks valid, otherwise random fail
    // For sandbox, always return success for 192.168.*.* or localhost
    const isMockValid = ipAddress.includes('192.168.') || ipAddress.includes('localhost') || ipAddress.includes('127.0.0.1');

    if (isMockValid || Math.random() > 0.2) {
      return NextResponse.json({ success: true, message: 'Ping successful. Connection OK.' });
    } else {
      return NextResponse.json({ success: false, error: 'Ping timeout. EDC tidak merespon.' }, { status: 408 });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
