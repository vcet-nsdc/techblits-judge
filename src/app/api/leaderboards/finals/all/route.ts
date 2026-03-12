import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { LeaderboardService } from '@/lib/leaderboard';

export async function GET() {
  try {
    await connectDB();
    
    const domains = await Domain.find({ isActive: true }).lean();
    const leaderboards: Record<string, unknown> = {};
    
    for (const domain of domains) {
      const domainId = domain._id.toString();
      leaderboards[domainId] = {
        domainName: domain.name,
        entries: await LeaderboardService.getFinalsLeaderboard(domainId)
      };
    }
    
    return NextResponse.json({ leaderboards });
  } catch (error) {
    console.error('Error fetching all finals leaderboards:', error);
    return NextResponse.json({ error: 'Failed to fetch finals leaderboards' }, { status: 500 });
  }
}
