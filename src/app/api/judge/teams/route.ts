import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Lab } from '@/models/Lab';
import { Score } from '@/models/Score';
import { Competition } from '@/models/Competition';
import { CompetitionRound, VenueType } from '@/types/competition';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

function toObjectIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const withId = value as { _id?: unknown; toString?: () => string; name?: string };
    if (withId._id) return toObjectIdString(withId._id);
    if (typeof withId.toString === 'function') return withId.toString();
  }
  return '';
}

function getDisplayName(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'name' in value) {
    const named = value as { name?: string };
    return named.name || '';
  }
  return '';
}

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

    const competition = await Competition.findOne({ isActive: true });
    const currentRound = competition?.currentRound || CompetitionRound.LAB_ROUND;

    let teams;

    if (judge.role === JudgeRole.SEMINAR_HALL) {
      const seminarHall = competition?.seminarHallId
        ? await Lab.findById(competition.seminarHallId)
        : await Lab.findOne({ type: VenueType.SEMINAR_HALL });

      if (!seminarHall) {
        return NextResponse.json({
          teams: [],
          currentRound,
          judgeLab: judge.assignedLabId,
          assignedDomains: judge.assignedDomains,
          judgeRole: judge.role,
        });
      }

      teams = await Team.find({
        qualifiedForFinals: true,
        finalVenueId: seminarHall._id,
        domainId: { $in: judge.assignedDomains },
        isActive: true
      }).populate('labId domainId');
    } else {
      teams = await Team.find({
        labId: judge.assignedLabId,
        isActive: true
      }).populate('labId domainId');
    }

    const scoreRound = judge.role === JudgeRole.SEMINAR_HALL
      ? CompetitionRound.FINALS
      : CompetitionRound.LAB_ROUND;
    const scoredTeamIds = new Set(
      (await Score.find({
        judgeId: judge._id,
        round: scoreRound,
        teamId: { $in: teams.map((team) => team._id) }
      }, { teamId: 1 }).lean()).map((score) => toObjectIdString(score.teamId))
    );

    return NextResponse.json({
      teams: teams.map((team) => ({
        id: team._id.toString(),
        name: team.name,
        lab: getDisplayName(team.labId),
        domain: getDisplayName(team.domainId),
        problemStatement: team.problemStatement || 'No mission statement provided.',
        members: team.members.map((member) => member.name),
        githubRepo: team.githubRepo || '',
        figmaLink: team.figmaLink || null,
        currentScore: team.currentScore,
        finalScore: team.finalScore,
        qualifiedForFinals: team.qualifiedForFinals,
        hasScored: scoredTeamIds.has(team._id.toString()),
      })),
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
