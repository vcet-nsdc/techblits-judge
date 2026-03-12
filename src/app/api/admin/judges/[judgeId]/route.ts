import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Judge } from '@/models/Judge';
import { AuthService } from '@/lib/auth';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

const updateJudgeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(4).optional(),
  assignedLabId: z.string().optional(),
  assignedDomains: z.array(z.string()).optional(),
  role: z.enum(['lab_round', 'seminar_hall', 'admin']).optional(),
  isActive: z.boolean().optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ judgeId: string }> }
) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const { judgeId } = await params;
    const body = await request.json();
    const data = updateJudgeSchema.parse(body);
    
    const updateData: Record<string, unknown> = { ...data };
    
    // Hash password if provided
    if (data.password) {
      updateData.passwordHash = await AuthService.hashPassword(data.password);
      delete updateData.password;
    }
    
    const judge = await Judge.findByIdAndUpdate(judgeId, { $set: updateData }, { new: true })
      .select('-passwordHash')
      .populate('assignedLabId', 'name')
      .populate('assignedDomains', 'name');
    
    if (!judge) {
      return NextResponse.json({ error: 'Judge not found' }, { status: 404 });
    }
    
    return NextResponse.json({ judge });
  } catch (error) {
    console.error('Error updating judge:', error);
    return NextResponse.json({ error: 'Failed to update judge' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ judgeId: string }> }
) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const { judgeId } = await params;
    
    const judge = await Judge.findById(judgeId)
      .select('-passwordHash')
      .populate('assignedLabId', 'name')
      .populate('assignedDomains', 'name')
      .lean();
    
    if (!judge) {
      return NextResponse.json({ error: 'Judge not found' }, { status: 404 });
    }
    
    return NextResponse.json({ judge });
  } catch (error) {
    console.error('Error fetching judge:', error);
    return NextResponse.json({ error: 'Failed to fetch judge' }, { status: 500 });
  }
}
