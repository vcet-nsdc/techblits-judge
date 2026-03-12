import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Score } from '@/models/Score';
import { Team } from '@/models/Team';
import { Judge, JudgeRole } from '@/models/Judge';
import { Lab } from '@/models/Lab';
import { Competition } from '@/models/Competition';
import { VenueType } from '@/types/competition';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';
import { LeaderboardService } from '@/lib/leaderboard';
import { competitionCacheService } from '@/lib/competition-cache';

function extractObjectId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const asObj = value as Record<string, unknown>;
    if (typeof asObj.toHexString === 'function') return (asObj.toHexString as () => string)();
    if (asObj._id && asObj._id !== value) return extractObjectId(asObj._id);
  }
  return String(value);
}

const finalsScoreSchema = z.object({
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  marks: z.number().min(0).max(100),
  criteria: z.array(z.object({
    name: z.string().min(1),
    marks: z.number().min(0).max(100)
  })).optional(),
  feedback: z.string().max(1000).optional()
});

/**
 * POST /api/judge/seminar-hall/scores
 * Seminar Hall judge submits a finals score for a qualifying team.
 */
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

    if (judge.role !== JudgeRole.SEMINAR_HALL) {
      return NextResponse.json({ error: 'Only Seminar Hall judges can use this endpoint' }, { status: 403 });
    }

    // Check finals round is currently active
    const competition = await Competition.findOne({ isActive: true });
    if (competition?.currentRound !== 'finals') {
      return NextResponse.json({ error: 'Finals round is not currently active' }, { status: 400 });
    }

    const body = await request.json();
    const { teamId, marks, criteria, feedback } = finalsScoreSchema.parse(body);

    const team = await Team.findById(teamId);
    if (!team || !team.isActive) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Team must have qualified
    if (!team.qualifiedForFinals) {
      return NextResponse.json({ error: 'Team has not qualified for finals' }, { status: 403 });
    }

    // Seminar Hall venue check
    const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
    if (!seminarHall) {
      return NextResponse.json({ error: 'Seminar Hall not configured' }, { status: 500 });
    }
    if (team.finalVenueId?.toString() !== seminarHall._id.toString()) {
      return NextResponse.json({ error: 'Team is not assigned to Seminar Hall' }, { status: 403 });
    }

    // Domain assignment check
    const hasAccess = judge.assignedDomains.some(
      (d: unknown) => extractObjectId(d) === team.domainId.toString()
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Judge not assigned to this domain' }, { status: 403 });
    }

    // Upsert score
    const existingScore = await Score.findOne({
      teamId: team._id,
      judgeId: judge._id,
      domainId: team.domainId,
      round: 'finals'
    });

    if (existingScore) {
      existingScore.marks = marks;
      if (criteria) existingScore.criteria = criteria;
      existingScore.feedback = feedback;
      existingScore.venueId = seminarHall._id;
      existingScore.submittedAt = new Date();
      await existingScore.save();
    } else {
      await new Score({
        teamId: team._id,
        judgeId: judge._id,
        domainId: team.domainId,
        venueId: seminarHall._id,
        round: 'finals',
        marks,
        criteria,
        feedback,
        submittedAt: new Date()
      }).save();
    }

    // Invalidate and recalculate finals leaderboard
    const domainId = team.domainId.toString();
    await LeaderboardService.invalidateFinalsLeaderboard(domainId);
    const leaderboard = await LeaderboardService.getFinalsLeaderboard(domainId);
    const updatedEntry = leaderboard.find((entry) => entry.teamId === teamId);
    if (updatedEntry) {
      await Team.findByIdAndUpdate(team._id, {
        currentScore: updatedEntry.totalScore,
        finalScore: updatedEntry.totalScore,
      });
    }

    // Queue real-time update
    await competitionCacheService.queueScoreUpdate(
      domainId,
      'finals',
      teamId,
      judge._id.toString(),
      { marks, feedback, submittedAt: new Date().toISOString() }
    );

    return NextResponse.json({
      success: true,
      message: 'Finals score submitted successfully',
      leaderboard
    });
  } catch (error) {
    console.error('Finals score submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to submit finals score' }, { status: 500 });
  }
}

/**
 * GET /api/judge/seminar-hall/scores?domainId=...
 * Returns the current finals leaderboard for a domain (Seminar Hall judge view).
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token || undefined);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const judge = await Judge.findById(user.userId).populate('assignedDomains');
    if (!judge || !judge.isActive) {
      return NextResponse.json({ error: 'Judge not found or inactive' }, { status: 403 });
    }

    if (judge.role !== JudgeRole.SEMINAR_HALL) {
      return NextResponse.json({ error: 'Access denied: not a Seminar Hall judge' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 });
    }

    const hasAccess = judge.assignedDomains.some(
      (d: unknown) => extractObjectId(d) === domainId
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Judge not assigned to this domain' }, { status: 403 });
    }

    const leaderboard = await LeaderboardService.getFinalsLeaderboard(domainId);

    return NextResponse.json({ leaderboard, round: 'finals', venue: 'Seminar Hall' });
  } catch (error) {
    console.error('Finals leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch finals leaderboard' }, { status: 500 });
  }
}
