import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCertificatesForTeam, searchTeamsByName } from '@/lib/certificates';

const triggerSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  sessionKey: z.string().min(1).optional()
});

function getClientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }
  return request.headers.get('x-real-ip') ?? undefined;
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limitRaw = Number(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        query,
        matches: []
      });
    }

    const matches = await searchTeamsByName(query, Number.isFinite(limitRaw) ? limitRaw : 10);

    return NextResponse.json({
      success: true,
      query,
      matches
    });
  } catch (error) {
    console.error('Team search failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search teams' },
      { status: 500 }
    );
  }
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

    const parsed = triggerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload',
          details: parsed.error.issues
        },
        { status: 400 }
      );
    }

    const actor = request.headers.get('x-requested-by') || 'search-endpoint';
    const result = await generateCertificatesForTeam({
      teamName: parsed.data.teamName,
      sessionKey: parsed.data.sessionKey,
      actor,
      endpoint: 'search_trigger',
      requestedByIp: getClientIp(request)
    });

    return NextResponse.json({
      success: true,
      message: 'Certificates generated successfully',
      team: result.teamName,
      sessionKey: result.sessionKey,
      generatedCount: result.generatedCount,
      certificates: result.certificates
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate certificates';
    const status = message === 'Team not found' ? 404 : 422;

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}
