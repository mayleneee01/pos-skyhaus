import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Step 1: Find admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@skyhaus.com' },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' });
    }

    // Step 2: Test bcrypt compare
    const testPassword = 'AdminSkyhaus!2024';
    let bcryptResult = false;
    let bcryptError = null;

    try {
      bcryptResult = await bcrypt.compare(testPassword, user.password);
    } catch (err: any) {
      bcryptError = err.message;
    }

    return NextResponse.json({
      success: true,
      userFound: true,
      userName: user.name,
      userEmail: user.email,
      userIsActive: user.isActive,
      passwordHashPrefix: user.password.substring(0, 10) + '...',
      bcryptCompareResult: bcryptResult,
      bcryptError: bcryptError,
      bcryptVersion: typeof bcrypt.hashSync,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
