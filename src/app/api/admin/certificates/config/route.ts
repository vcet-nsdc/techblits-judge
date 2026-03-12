import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { CertificateConfig } from '@/models/CertificateConfig';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const config = await CertificateConfig.findOne().sort({ updatedAt: -1 }).lean();

    if (!config) {
      return NextResponse.json({ success: true, config: null });
    }

    return NextResponse.json({
      success: true,
      config: {
        templateImagePath: config.templateImagePath,
        nameX: config.nameX,
        nameY: config.nameY,
        nameSize: config.nameSize,
        nameColor: config.nameColor,
        teamX: config.teamX,
        teamY: config.teamY,
        teamSize: config.teamSize,
        teamColor: config.teamColor,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

const configSchema = z.object({
  templateImagePath: z.string().min(1),
  nameX: z.number().min(0).max(10000),
  nameY: z.number().min(0).max(10000),
  nameSize: z.number().min(8).max(200),
  nameColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  teamX: z.number().min(0).max(10000),
  teamY: z.number().min(0).max(10000),
  teamSize: z.number().min(8).max(200),
  teamColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid config data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await CertificateConfig.findOne().sort({ updatedAt: -1 });
    if (existing) {
      Object.assign(existing, parsed.data);
      await existing.save();
    } else {
      await CertificateConfig.create(parsed.data);
    }

    return NextResponse.json({ success: true, message: 'Config saved successfully' });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
