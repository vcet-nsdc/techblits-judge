import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const domains = await Domain.find({ isActive: true }).sort({ name: 1 });
    
    return NextResponse.json({
      domains: domains.map(domain => ({
        _id: domain._id,
        id: domain._id,
        name: domain.name,
        description: domain.description,
        scoringCriteria: domain.scoringCriteria
      }))
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json({
      error: 'Failed to fetch domains'
    }, { status: 500 });
  }
}
