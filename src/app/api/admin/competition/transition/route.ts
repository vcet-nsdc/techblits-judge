import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Lab } from '@/models/Lab';
import { Team } from '@/models/Team';
import { Competition } from '@/models/Competition';
import { LeaderboardService } from '@/lib/leaderboard';
import { competitionCacheService } from '@/lib/competition-cache';
import { socketServer } from '@/lib/websocket';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

/**
 * POST /api/admin/competition/transition
 * Admin-only: Transition competition from lab round to Seminar Hall finals.
 *
 * 1. Identifies top-N teams per domain from lab round scores.
 * 2. Marks them as qualified (qualifiedForFinals=true, finalVenueId=<SeminarHall>).
 * 3. Updates competition currentRound to 'finals'.
 * 4. Clears all leaderboard caches.
 *
 * Body: { qualifiedPerDomain?: number }  (defaults to competition.qualifiedTeamsPerDomain or 5)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    // Admin auth check
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const qualifiedPerDomainOverride: number | undefined = body.qualifiedPerDomain;

    // Find active competition
    const competition = await Competition.findOne({ isActive: true });
    if (!competition) {
      return NextResponse.json({ error: 'No active competition found' }, { status: 404 });
    }

    if (competition.currentRound === 'finals') {
      return NextResponse.json({ error: 'Competition is already in finals round' }, { status: 400 });
    }

    const limit = qualifiedPerDomainOverride ?? competition.qualifiedTeamsPerDomain ?? 5;

    // Identify and assign top-N teams per domain to Seminar Hall.
    const syncResult = await LeaderboardService.syncTopTeamsToSeminarHall(limit);

    const qualifiedTeams = await Team.find({
      _id: {
        $in: syncResult.qualifiedTeamIds.map((id) => new mongoose.Types.ObjectId(id))
      }
    }).lean();

    const qualifiedTeamSummary = qualifiedTeams.map((team) => ({
      teamId: team._id.toString(),
      teamName: team.name,
      domainId: team.domainId.toString()
    }));

    const seminarHall = await Lab.findById(syncResult.seminarHallId);

    // Update competition state → finals
    await Competition.findByIdAndUpdate(competition._id, {
      currentRound: 'finals',
      seminarHallId: seminarHall?._id,
      labRoundEndTime: new Date(),
      finalsStartTime: new Date()
    });

    // Invalidate all leaderboard caches
    await competitionCacheService.clearAllLeaderboards();

    // WebSocket broadcast round_transition event to ALL connected clients
    if (socketServer.io) {
      socketServer.io.emit('round_transition', {
        round: 'finals',
        venue: 'Seminar Hall',
        qualifiedTeams: qualifiedTeamSummary,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: `Finals started - ${qualifiedTeamSummary.length} teams qualified`,
      seminarHall: {
        id: seminarHall?._id,
        name: seminarHall?.name
      },
      qualifiedTeams: qualifiedTeamSummary,
      totalQualified: qualifiedTeamSummary.length,
      limitPerDomain: limit
    });
  } catch (error) {
    console.error('Round transition error:', error);
    return NextResponse.json({ error: 'Failed to transition to finals' }, { status: 500 });
  }
}

/**
 * GET /api/admin/competition/transition
 * Returns the current transition status and any qualified teams.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const token = extractTokenFromRequest(request);
    const user = verifyToken(token ?? undefined);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competition = await Competition.findOne({ isActive: true });
    if (!competition) {
      return NextResponse.json({ error: 'No active competition' }, { status: 404 });
    }

    const qualifiedTeams = await Team.find({ qualifiedForFinals: true, isActive: true })
      .populate('domainId', 'name')
      .populate('finalVenueId', 'name')
      .lean();

    return NextResponse.json({
      currentRound: competition.currentRound,
      seminarHallId: competition.seminarHallId,
      qualifiedTeamsPerDomain: competition.qualifiedTeamsPerDomain,
      labRoundEndTime: competition.labRoundEndTime,
      finalsStartTime: competition.finalsStartTime,
      qualifiedTeams: qualifiedTeams.map(t => ({
        teamId: t._id.toString(),
        teamName: t.name,
        domain: (t.domainId as { _id?: unknown; name?: string })?.name,
        domainId: (t.domainId as { _id?: { toString(): string } })?._id?.toString() ?? '',
        finalVenue: (t.finalVenueId as { name?: string })?.name,
        finalScore: t.finalScore
      }))
    });
  } catch (error) {
    console.error('Transition status error:', error);
    return NextResponse.json({ error: 'Failed to fetch transition status' }, { status: 500 });
  }
}
