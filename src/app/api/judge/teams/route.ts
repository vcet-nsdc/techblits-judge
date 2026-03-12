import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Lab } from '@/models/Lab';
import { Competition } from '@/models/Competition';
import { CompetitionRound, VenueType } from '@/types/competition';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

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
