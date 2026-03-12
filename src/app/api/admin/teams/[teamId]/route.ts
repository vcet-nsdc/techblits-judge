import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  labId: z.string().optional(),
  domainId: z.string().optional(),
  members: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['leader', 'member']).default('member')
  })).optional(),
  isActive: z.boolean().optional(),
  qualifiedForFinals: z.boolean().optional(),
  finalVenueId: z.string().nullable().optional(),
  finalScore: z.number().nullable().optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const { teamId } = await params;
    const body = await request.json();
    const data = updateTeamSchema.parse(body);
    
    const team = await Team.findByIdAndUpdate(teamId, { $set: data }, { new: true })
      .populate('labId', 'name')
      .populate('domainId', 'name');
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const { teamId } = await params;
    
    const team = await Team.findById(teamId)
      .populate('labId', 'name location')
      .populate('domainId', 'name')
      .lean();
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}
