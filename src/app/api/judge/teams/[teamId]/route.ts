import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Score } from '@/models/Score';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';
import { Competition, type ICompetition } from '@/models/Competition';
import { CompetitionRound } from '@/types/competition';

function toObjectIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  // Check for Mongoose ObjectId first (has toHexString method) to avoid infinite recursion
  if (typeof value === 'object' && value !== null) {
    const asObj = value as Record<string, unknown>;
    if (typeof asObj.toHexString === 'function') return (asObj.toHexString as () => string)();
    if (asObj._id && asObj._id !== value) return toObjectIdString(asObj._id);
    if (typeof asObj.toString === 'function') return asObj.toString();
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
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

    const { teamId } = await params;
    const team = await Team.findById(teamId).populate('labId domainId');
    if (!team || !team.isActive) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const judgeLabId = toObjectIdString(judge.assignedLabId);
    const teamLabId = toObjectIdString(team.labId);
    const teamDomainId = toObjectIdString(team.domainId);
    const assignedDomainIds = judge.assignedDomains.map((domain) => toObjectIdString(domain));

    if (judge.role === JudgeRole.SEMINAR_HALL) {
      if (!team.qualifiedForFinals || !assignedDomainIds.includes(teamDomainId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (!judgeLabId || judgeLabId !== teamLabId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const competition = await Competition.findOne({ isActive: true }).lean() as ICompetition | null;
    const round = competition?.currentRound ?? CompetitionRound.LAB_ROUND;
    const existingScore = await Score.findOne({
      teamId: team._id,
      judgeId: judge._id,
      round: judge.role === JudgeRole.SEMINAR_HALL ? CompetitionRound.FINALS : CompetitionRound.LAB_ROUND,
    }).lean();

    return NextResponse.json({
      team: {
        id: team._id.toString(),
        name: team.name,
        lab: getDisplayName(team.labId),
        domain: getDisplayName(team.domainId),
        problemStatement: team.problemStatement || 'No mission statement provided.',
        members: team.members.map((member) => member.name),
        githubRepo: team.githubRepo || '',
        figmaLink: team.figmaLink || null,
        hasScored: Boolean(existingScore),
        round,
      }
    });
  } catch (error) {
    console.error('Error fetching judge team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}