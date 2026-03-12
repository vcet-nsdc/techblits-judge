import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { Lab } from '@/models/Lab';
import { Domain } from '@/models/Domain';
import { VenueType } from '@/types/competition';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';
import { competitionCacheService } from '@/lib/competition-cache';

// GET: fetch qualifiers grouped by domain
export async function GET(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    
    const domains = await Domain.find({ isActive: true }).lean();
    const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
    
    const qualifiers: Record<string, unknown[]> = {};
    
    for (const domain of domains) {
      const teams = await Team.find({
        domainId: domain._id,
        qualifiedForFinals: true,
        ...(seminarHall ? { finalVenueId: seminarHall._id } : {}),
        isActive: true
      })
        .populate('labId', 'name')
        .populate('domainId', 'name')
        .lean();
      
      qualifiers[domain.name] = teams.map(t => ({
        _id: t._id,
        name: t.name,
        domainId: t.domainId,
        labId: t.labId,
        currentScore: t.currentScore,
        finalScore: t.finalScore,
        members: t.members
      }));
    }
    
    return NextResponse.json({
      qualifiers,
      seminarHallId: seminarHall?._id?.toString() || null,
      totalQualified: Object.values(qualifiers).reduce((acc, arr) => acc + arr.length, 0)
    });
  } catch (error) {
    console.error('Error fetching qualifiers:', error);
    return NextResponse.json({ error: 'Failed to fetch qualifiers' }, { status: 500 });
  }
}

// PUT: manually override qualifier list
const overrideSchema = z.object({
  teamIds: z.array(z.string()),
  domainId: z.string()
});

export async function PUT(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const body = await request.json();
    const { teamIds, domainId } = overrideSchema.parse(body);
    
    const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
    if (!seminarHall) {
      return NextResponse.json({ error: 'Seminar Hall not found' }, { status: 404 });
    }
    
    // Remove existing qualifiers for this domain
    await Team.updateMany(
      { domainId: new mongoose.Types.ObjectId(domainId), qualifiedForFinals: true },
      { $set: { qualifiedForFinals: false, finalVenueId: null } }
    );
    
    // Set new qualifiers
    if (teamIds.length > 0) {
      await Team.updateMany(
        { _id: { $in: teamIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { $set: { qualifiedForFinals: true, finalVenueId: seminarHall._id } }
      );
    }
    
    // Invalidate caches
    await competitionCacheService.invalidatePattern('leaderboard:*');
    await competitionCacheService.invalidatePattern('seminar_hall:*');
    
    return NextResponse.json({
      success: true,
      message: `Updated qualifiers for domain ${domainId}`,
      qualifiedCount: teamIds.length
    });
  } catch (error) {
    console.error('Error updating qualifiers:', error);
    return NextResponse.json({ error: 'Failed to update qualifiers' }, { status: 500 });
  }
}
