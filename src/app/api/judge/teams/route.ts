import { NextRequest, NextResponse } from 'next/server';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Competition } from '@/models/Competition';
import { CompetitionRound } from '@/types/competition';
import { verifyToken } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const user = verifyToken(token || undefined);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const judge = await Judge.findById(user.userId).populate('assignedLabId assignedDomains');
    
    if (!judge || !judge.isActive) {
      return NextResponse.json({ error: 'Judge not found or inactive' }, { status: 403 });
    }

    const competition = await Competition.findOne({ isActive: true });
    const currentRound = competition?.currentRound || CompetitionRound.LAB_ROUND;

    let teams;

    if (judge.role === JudgeRole.SEMINAR_HALL) {
      // Seminar Hall judge: show only qualifying teams from assigned domains
      teams = await Team.find({
        qualifiedForFinals: true,
        domainId: { $in: judge.assignedDomains },
        isActive: true
      }).populate('labId domainId');
    } else if (currentRound === CompetitionRound.LAB_ROUND) {
      // Lab round: Show only teams in judge's assigned lab
      teams = await Team.find({
        labId: judge.assignedLabId,
        isActive: true
      }).populate('labId domainId');
    } else {
      // Final round (legacy): Show only top 5 teams per domain for judge's assigned domains
      const { LeaderboardService } = await import('@/lib/leaderboard');
      const topTeams = await LeaderboardService.getTopTeamsPerDomain(5);
      
      teams = topTeams.filter(team => 
        judge.assignedDomains.some((domainId: any) => 
          domainId.toString() === team.domainId.toString()
        )
      );
    }

    return NextResponse.json({
      teams,
      currentRound,
      judgeLab: judge.assignedLabId,
      assignedDomains: judge.assignedDomains,
      judgeRole: judge.role
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
