import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Score } from '@/models/Score';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Lab } from '@/models/Lab';
import { Competition } from '@/models/Competition';
import { CompetitionRound, VenueType } from '@/types/competition';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';
import { LeaderboardService } from '@/lib/leaderboard';
import { competitionCacheService } from '@/lib/competition-cache';

function toObjectIdString(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === 'object' && value !== null) {
    const withId = value as { _id?: unknown; toString?: () => string };
    if (withId._id) {
      return toObjectIdString(withId._id);
    }
    if (typeof withId.toString === 'function') {
      return withId.toString();
    }
  }

  return '';
}

const scoreSchema = z.object({
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  marks: z.number().min(0).max(100),
  feedback: z.string().max(1000).optional(),
  round: z.enum(['lab_round', 'finals']),
  criteria: z.array(z.object({
    name: z.string().min(1),
    marks: z.number().min(0).max(100)
  })).optional()
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { teamId, marks, feedback, round, criteria } = scoreSchema.parse(body);

    // Validate judge permissions
    const team = await Team.findById(teamId).populate('labId domainId');
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if round is active
    const competition = await Competition.findOne({ isActive: true });
    const activeRound = competition?.currentRound ?? CompetitionRound.LAB_ROUND;
    if (activeRound !== round) {
      return NextResponse.json({ error: 'Round is not currently active' }, { status: 400 });
    }

    // Determine venue for the score
    let venueId: mongoose.Types.ObjectId;

    // Lab round validation: Judge can only score teams in their assigned lab
    if (round === CompetitionRound.LAB_ROUND) {
      if (judge.role === JudgeRole.SEMINAR_HALL) {
        return NextResponse.json({ error: 'Seminar Hall judges cannot score in lab round' }, { status: 403 });
      }
      const teamLabId = toObjectIdString(team.labId);
      const judgeLabId = toObjectIdString(judge.assignedLabId);
      if (!teamLabId || !judgeLabId || teamLabId !== judgeLabId) {
        return NextResponse.json({ error: 'Judge can only score teams in assigned lab' }, { status: 403 });
      }
      venueId = new mongoose.Types.ObjectId(judgeLabId);
    } else if (round === 'finals') {
      // Finals validation: must be seminar hall judge
      if (judge.role !== JudgeRole.SEMINAR_HALL) {
        return NextResponse.json({ error: 'Only Seminar Hall judges can score in finals round' }, { status: 403 });
      }

      // Team must have qualified for finals
      if (!team.qualifiedForFinals) {
        return NextResponse.json({ error: 'Team has not qualified for finals' }, { status: 403 });
      }

      // Seminar Hall must exist and team must be assigned to it
      const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
      if (!seminarHall) {
        return NextResponse.json({ error: 'Seminar Hall not configured' }, { status: 500 });
      }
      const teamFinalVenueId = toObjectIdString(team.finalVenueId);
      if (teamFinalVenueId !== seminarHall._id.toString()) {
        return NextResponse.json({ error: 'Team is not assigned to Seminar Hall' }, { status: 403 });
      }

      // Judge must be assigned to this domain
      const teamDomainId = toObjectIdString(team.domainId);
      const assignedDomainIds = judge.assignedDomains.map((domain) => toObjectIdString(domain));
      if (!teamDomainId || !assignedDomainIds.includes(teamDomainId)) {
        return NextResponse.json({ error: 'Judge not assigned to this domain' }, { status: 403 });
      }

      venueId = seminarHall._id as mongoose.Types.ObjectId;
    } else {
      return NextResponse.json({ error: 'Invalid round value' }, { status: 400 });
    }

    // Check if score already exists for this judge-team-domain-round combination
    const existingScore = await Score.findOne({
      teamId,
      judgeId: judge._id,
      domainId: team.domainId,
      round
    });

    if (existingScore) {
      existingScore.marks = marks;
      existingScore.feedback = feedback;
      existingScore.venueId = venueId;
      existingScore.submittedAt = new Date();
      if (criteria) existingScore.criteria = criteria;
      await existingScore.save();
    } else {
      const score = new Score({
        teamId,
        judgeId: judge._id,
        domainId: team.domainId,
        venueId,
        round,
        marks,
        feedback,
        criteria,
        submittedAt: new Date()
      });
      await score.save();
    }

    if (round === CompetitionRound.LAB_ROUND) {
      const qualifiedPerDomain = competition?.qualifiedTeamsPerDomain ?? 5;
      await LeaderboardService.syncTopTeamsToSeminarHall(qualifiedPerDomain);
    }

    // Invalidate cache and recalculate leaderboard
    let leaderboard;
    if (round === 'finals') {
      await LeaderboardService.invalidateFinalsLeaderboard(team.domainId.toString());
      leaderboard = await LeaderboardService.getFinalsLeaderboard(team.domainId.toString());
    } else {
      await LeaderboardService.invalidateLeaderboard(team.domainId.toString(), round as CompetitionRound);
      leaderboard = await LeaderboardService.getLeaderboard(team.domainId.toString(), round as CompetitionRound);
    }

    const updatedEntry = leaderboard.find((entry) => entry.teamId === teamId);
    if (updatedEntry) {
      await Team.findByIdAndUpdate(teamId, {
        currentScore: updatedEntry.totalScore,
        ...(round === CompetitionRound.FINALS ? { finalScore: updatedEntry.totalScore } : {}),
      });
    }

    // Queue score update for real-time processing
    await competitionCacheService.queueScoreUpdate(
      team.domainId.toString(),
      round,
      teamId,
      judge._id.toString(),
      { marks, feedback, submittedAt: new Date().toISOString() }
    );

    return NextResponse.json({
      success: true,
      message: 'Score submitted successfully',
      leaderboard
    });
  } catch (error) {
    console.error('Score submission error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit score' },
      { status: 500 }
    );
  }
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

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');
    const round = searchParams.get('round') as CompetitionRound;

    if (!domainId || !round) {
      return NextResponse.json({ error: 'Domain ID and round are required' }, { status: 400 });
    }

    // Validate judge has access to this domain
    const domains = judge.assignedDomains.map((domain) => toObjectIdString(domain)).filter(Boolean);
    if (!domains.includes(domainId)) {
      return NextResponse.json({ error: 'Judge not assigned to this domain' }, { status: 403 });
    }

    const leaderboard = round === CompetitionRound.FINALS
      ? await LeaderboardService.getFinalsLeaderboard(domainId)
      : await LeaderboardService.getLeaderboard(domainId, round);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
