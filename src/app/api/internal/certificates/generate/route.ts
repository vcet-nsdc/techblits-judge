import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCertificateConfig, getTeamAttendedMembers } from '@/lib/certificates';

const generateSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
});

function isAuthorizedBySecret(request: NextRequest): { authorized: boolean; reason?: string } {
  const configuredSecret = process.env.CERTIFICATE_API_SECRET;
  if (!configuredSecret) {
    return { authorized: false, reason: 'CERTIFICATE_API_SECRET is not configured' };
  }

  const headerSecret = request.headers.get('x-internal-secret');
  const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
  const providedSecret = headerSecret || bearer;

  if (!providedSecret) {
    return { authorized: false, reason: 'Missing secret key' };
  }

  const expectedBuffer = Buffer.from(configuredSecret, 'utf8');
  const providedBuffer = Buffer.from(providedSecret, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return { authorized: false, reason: 'Invalid secret key' };
  }

  const isValid = timingSafeEqual(expectedBuffer, providedBuffer);
  return isValid ? { authorized: true } : { authorized: false, reason: 'Invalid secret key' };
}

export async function POST(request: NextRequest) {
  try {
    const auth = isAuthorizedBySecret(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.reason || 'Unauthorized' },
        { status: 401 }
      );
    }

    const parsed = generateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const config = await getCertificateConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Certificate config not set up' },
        { status: 503 }
      );
    }

    const teamData = await getTeamAttendedMembers(parsed.data.teamName);

    return NextResponse.json({
      success: true,
      teamName: teamData.teamName,
      members: teamData.members,
      config: {
        templateUrl: config.templateImagePath,
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
    const message = error instanceof Error ? error.message : 'Failed to generate certificates';
    const status = message.includes('not found') ? 404 : 422;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
