import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Team } from '@/models/Team';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

const createTeamSchema = z.object({
  name: z.string().min(1),
  labId: z.string(),
  domainId: z.string(),
  members: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['leader', 'member']).default('member')
  })).min(1)
});

// POST: create team manually
export async function POST(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const body = await request.json();
    const data = createTeamSchema.parse(body);
    
    const team = await Team.create(data);
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

// GET: list all teams with filters
export async function GET(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');
    const labId = searchParams.get('labId');
    
    const filter: Record<string, unknown> = { isActive: true };
    if (domainId) filter.domainId = domainId;
    if (labId) filter.labId = labId;
    
    const teams = await Team.find(filter)
      .populate('labId', 'name location')
      .populate('domainId', 'name')
      .sort({ name: 1 })
      .lean();
    
    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
