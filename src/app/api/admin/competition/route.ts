import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Competition } from '@/models/Competition';
import { extractTokenFromRequest, verifyToken } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const user = verifyToken(token ?? undefined);
  
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectDB();
    const competition = await Competition.findOne({ isActive: true })
      .populate('seminarHallId')
      .lean();
    
    if (!competition) {
      return NextResponse.json({ error: 'No active competition found' }, { status: 404 });
    }
    
    return NextResponse.json({ competition });
  } catch (error) {
    console.error('Error fetching competition:', error);
    return NextResponse.json({ error: 'Failed to fetch competition' }, { status: 500 });
  }
}
