import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('template') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const allowed = ['image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PNG and JPG files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum 10MB allowed.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const filename = `certificate-template${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'certificates');
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const publicPath = `/certificates/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'Template uploaded successfully',
      templateImagePath: publicPath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload template' },
      { status: 500 }
    );
  }
}
