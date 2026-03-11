import { NextRequest, NextResponse } from 'next/server';
import { Domain } from '@/models/Domain';

export async function GET(request: NextRequest) {
  try {
    const domains = await Domain.find({ isActive: true }).sort({ name: 1 });
    
    return NextResponse.json({
      domains: domains.map(domain => ({
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
