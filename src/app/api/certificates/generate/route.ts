import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCertificateConfig, getTeamAttendedMembers } from '@/lib/certificates';

const schema = z.object({
  teamName: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid team name' },
        { status: 400 }
      );
    }

    const config = await getCertificateConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Certificates are not configured yet. Please contact the organizers.' },
        { status: 503 }
      );
    }

    const teamData = await getTeamAttendedMembers(parsed.data.teamName);

    return NextResponse.json({
      success: true,
      teamName: teamData.teamName,
      members: teamData.members,
      config: {
        templateUrl: config.templateImagePath.startsWith('/')
          ? config.templateImagePath
          : `/${config.templateImagePath}`,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    const status = message.includes('not found') ? 404 : 422;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

