import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Judge } from '@/models/Judge';
import { AuthService } from '@/lib/auth';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';
import { JudgeRole } from '@/types/competition';

const createJudgeSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  password: z.string().min(4),
  assignedLabId: z.string(),
  assignedDomains: z.array(z.string()),
  role: z.enum(['lab_round', 'seminar_hall', 'admin']).default('lab_round')
});

// POST: create judge
export async function POST(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const body = await request.json();
    const data = createJudgeSchema.parse(body);
    
    // Check if email already exists
    const existing = await Judge.findOne({ email: data.email });
    if (existing) {
      return NextResponse.json({ error: 'Judge with this email already exists' }, { status: 409 });
    }
    
    const judge = await AuthService.createJudge({
      ...data,
      role: data.role as JudgeRole,
    });
    
    return NextResponse.json({
      judge: {
        _id: judge._id,
        name: judge.name,
        email: judge.email,
        role: judge.role,
        assignedLabId: judge.assignedLabId,
        assignedDomains: judge.assignedDomains,
        isActive: judge.isActive
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating judge:', error);
    return NextResponse.json({ error: 'Failed to create judge' }, { status: 500 });
  }
}

// GET: list all judges
export async function GET(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    
    const judges = await Judge.find({})
      .select('-passwordHash')
      .populate('assignedLabId', 'name')
      .populate('assignedDomains', 'name')
      .sort({ name: 1 })
      .lean();
    
    return NextResponse.json({ judges });
  } catch (error) {
    console.error('Error fetching judges:', error);
    return NextResponse.json({ error: 'Failed to fetch judges' }, { status: 500 });
  }
}
