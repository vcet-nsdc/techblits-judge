import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Domain } from "@/models/Domain";
import { LeaderboardService } from "@/lib/leaderboard";
import { CompetitionRound } from "@/types/competition";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string; round: string }> },
) {
  try {
    await connectDB();
    const { domainId, round } = await params;

    // Validate domain exists
    const domain = await Domain.findById(domainId);
    if (!domain || !domain.isActive) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Validate round
    if (!Object.values(CompetitionRound).includes(round as CompetitionRound)) {
      return NextResponse.json({ error: "Invalid round" }, { status: 400 });
    }

    const leaderboard =
      round === CompetitionRound.FINALS
        ? await LeaderboardService.getFinalsLeaderboard(domainId)
        : await LeaderboardService.getLeaderboard(
            domainId,
            round as CompetitionRound,
          );

    return NextResponse.json(
      {
        domain: {
          id: domain._id,
          name: domain.name,
          description: domain.description,
        },
        round,
        leaderboard,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      },
    );
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
