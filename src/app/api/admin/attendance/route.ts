import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get('team');

    if (!teamName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const team = await Team.findOne(
      {
        isActive: true,
        name: { $regex: `^${escapeRegex(teamName.trim())}$`, $options: 'i' }
      },
      { _id: 1, name: 1, members: 1 }
    ).lean();

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      team: {
        id: team._id.toString(),
        name: team.name,
        members: (team.members ?? []).map((m: { name: string; attended?: boolean }) => ({
          name: m.name,
          attended: m.attended ?? false,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

const attendanceSchema = z.object({
  teamName: z.string().min(1).max(200),
  attendance: z.record(z.string(), z.boolean()),
});

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectDB();
    const team = await Team.findOne({
      isActive: true,
      name: { $regex: `^${escapeRegex(parsed.data.teamName.trim())}$`, $options: 'i' },
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    for (const member of team.members) {
      if (parsed.data.attendance[member.name] !== undefined) {
        member.attended = parsed.data.attendance[member.name];
      }
    }

    await team.save();

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
      team: team.name,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}
