import { NextRequest, NextResponse } from 'next/server';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Domain } from '@/models/Domain';
import { Competition } from '@/models/Competition';
import { LeaderboardService } from '@/lib/leaderboard';
import { verifyToken } from '@/lib/middleware/auth';
import { CompetitionRound } from '@/types/competition';

/**
 * GET /api/judge/seminar-hall/teams
 * Returns qualifying teams grouped by domain for a Seminar Hall judge.
 * Each team includes their lab round score for reference.
 */
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

    if (judge.role !== JudgeRole.SEMINAR_HALL) {
      return NextResponse.json({ error: 'Access denied: not a Seminar Hall judge' }, { status: 403 });
    }

    const competition = await Competition.findOne({ isActive: true });
    const qualifiedPerDomain = competition?.qualifiedTeamsPerDomain ?? 5;
    await LeaderboardService.syncTopTeamsToSeminarHall(qualifiedPerDomain);

    // Build domain-grouped response
    const domains = await Domain.find({
      _id: { $in: judge.assignedDomains },
      isActive: true
    });

    const result = await Promise.all(
      domains.map(async (domain) => {
        const domainId = domain._id.toString();

        // Get qualifying teams for this domain
        const teams = await Team.find({
          domainId: domain._id,
          qualifiedForFinals: true,
          isActive: true
        }).populate('labId');

        // Get lab round leaderboard to show reference scores
        const labLeaderboard = await LeaderboardService.getLeaderboard(
          domainId,
          CompetitionRound.LAB_ROUND
        );
        const labScoreMap = new Map(
          labLeaderboard.map((e) => [e.teamId, e.totalScore])
        );

        return {
          domainId,
          domainName: domain.name,
          teams: teams.map((team) => ({
            teamId: team._id.toString(),
            teamName: team.name,
            members: team.members,
            labRoundScore: labScoreMap.get(team._id.toString()) ?? 0,
            finalScore: team.finalScore,
            rank: team.rank
          }))
        };
      })
    );

    return NextResponse.json({
      venue: 'Seminar Hall',
      domains: result
    });
  } catch (error) {
    console.error('Seminar Hall teams fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch Seminar Hall teams' }, { status: 500 });
  }
}
