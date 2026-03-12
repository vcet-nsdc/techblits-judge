import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { LeaderboardService } from '@/lib/leaderboard';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.judgeRole !== 'seminar_hall') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');
    
    if (domainId) {
      const leaderboard = await LeaderboardService.getFinalsLeaderboard(domainId);
      return NextResponse.json({ leaderboard });
    }
    
    // Return all domains finals leaderboards
    const domains = await Domain.find({ isActive: true }).lean();
    const leaderboards: Record<string, unknown> = {};
    
    for (const domain of domains) {
      const id = domain._id.toString();
      leaderboards[id] = {
        domainName: domain.name,
        entries: await LeaderboardService.getFinalsLeaderboard(id)
      };
    }
    
    return NextResponse.json({ leaderboards });
  } catch (error) {
    console.error('Error fetching seminar hall leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
