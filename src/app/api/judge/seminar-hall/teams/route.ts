import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Domain } from '@/models/Domain';
import { Competition } from '@/models/Competition';
import { LeaderboardService } from '@/lib/leaderboard';
import { Lab } from '@/models/Lab';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';
import { CompetitionRound, VenueType } from '@/types/competition';

/**
 * GET /api/judge/seminar-hall/teams
 * Returns qualifying teams grouped by domain for a Seminar Hall judge.
 * Each team includes their lab round score for reference.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromRequest(request);
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
    if (competition?.currentRound !== CompetitionRound.FINALS) {
      return NextResponse.json({
        venue: 'Seminar Hall',
        domains: []
      });
    }

    const seminarHall = competition.seminarHallId
      ? await Lab.findById(competition.seminarHallId)
      : await Lab.findOne({ type: VenueType.SEMINAR_HALL });

    if (!seminarHall) {
      return NextResponse.json({
        venue: 'Seminar Hall',
        domains: []
      });
    }

    // Extract raw ObjectIds from populated assignedDomains
    const rawDomainIds = judge.assignedDomains.map((d: unknown) => {
      if (typeof d === 'object' && d !== null) {
        const asObj = d as Record<string, unknown>;
        if (typeof asObj.toHexString === 'function') return new mongoose.Types.ObjectId((asObj.toHexString as () => string)());
        if (asObj._id) return asObj._id as mongoose.Types.ObjectId;
      }
      return d as mongoose.Types.ObjectId;
    });

    // Build domain-grouped response
    const domains = await Domain.find({
      _id: { $in: rawDomainIds },
      isActive: true
    });

    const result = await Promise.all(
      domains.map(async (domain) => {
        const domainId = domain._id.toString();

        // Get qualifying teams for this domain
        const teams = await Team.find({
          domainId: domain._id,
          qualifiedForFinals: true,
          finalVenueId: seminarHall._id,
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
          })).sort((left, right) => right.labRoundScore - left.labRoundScore)
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
