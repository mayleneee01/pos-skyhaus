import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/upload — Upload file (QRIS image)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File wajib diupload' }, { status: 400 });
    }

    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: `Tipe file tidak didukung: ${file.type || 'unknown'}` }, { status: 400 });
    }

    // Max 1MB (karena kita akan simpan sebagai Base64 di database, lebih baik ukurannya kecil)
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Ukuran file maksimal 1MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Konversi ke Base64 (Vercel Serverless tidak mendukung tulis file lokal public/uploads)
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    return NextResponse.json({ success: true, data: { path: base64Image } });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
