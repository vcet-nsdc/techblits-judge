import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Competition } from '@/models/Competition';
import { CompetitionRound } from '@/types/competition';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const competition = await Competition.findOne({ isActive: true });
    
    if (!competition) {
      return NextResponse.json({
        error: 'No active competition found'
      }, { status: 404 });
    }

    return NextResponse.json({
      id: competition._id,
      name: competition.name,
      currentRound: competition.currentRound,
      qualifiedTeamsPerDomain: competition.qualifiedTeamsPerDomain,
      labRoundStartTime: competition.labRoundStartTime,
      labRoundEndTime: competition.labRoundEndTime,
      finalsStartTime: competition.finalsStartTime,
      finalsEndTime: competition.finalsEndTime,
      isActive: competition.isActive
    });
  } catch (error) {
    console.error('Error fetching competition status:', error);
    return NextResponse.json({
      error: 'Failed to fetch competition status'
    }, { status: 500 });
  }
}
