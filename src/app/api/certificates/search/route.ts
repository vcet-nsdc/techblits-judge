import { NextRequest, NextResponse } from 'next/server';
import { searchTeamsByName } from '@/lib/certificates';

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

