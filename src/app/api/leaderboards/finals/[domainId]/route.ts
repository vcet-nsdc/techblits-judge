import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { LeaderboardService } from '@/lib/leaderboard';

/**
 * GET /api/leaderboards/finals/[domainId]
 * Public endpoint — returns the Seminar Hall finals leaderboard for a domain.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    await connectDB();
    const { domainId } = await params;

    const domain = await Domain.findById(domainId);
    if (!domain || !domain.isActive) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const leaderboard = await LeaderboardService.getFinalsLeaderboard(domainId);

    return NextResponse.json({
      domain: {
        id: domain._id,
        name: domain.name,
        description: domain.description
      },
      round: 'finals',
      venue: 'Seminar Hall',
      leaderboard,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching finals leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch finals leaderboard' }, { status: 500 });
  }
}
