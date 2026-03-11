import { NextRequest, NextResponse } from 'next/server';
import { Competition } from '@/models/Competition';
import { CompetitionRound } from '@/types/competition';

export async function GET(request: NextRequest) {
  try {
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
      labRoundStartTime: competition.labRoundStartTime,
      labRoundEndTime: competition.labRoundEndTime,
      finalRoundStartTime: competition.finalRoundStartTime,
      finalRoundEndTime: competition.finalRoundEndTime,
      isActive: competition.isActive
    });
  } catch (error) {
    console.error('Error fetching competition status:', error);
    return NextResponse.json({
      error: 'Failed to fetch competition status'
    }, { status: 500 });
  }
}
