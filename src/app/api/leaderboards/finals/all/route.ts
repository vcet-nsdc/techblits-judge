import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Domain } from "@/models/Domain";
import { LeaderboardService } from "@/lib/leaderboard";

export async function GET() {
  try {
    await connectDB();

    const domains = await Domain.find({ isActive: true }).lean();

    const results = await Promise.allSettled(
      domains.map(async (domain) => {
        const domainId = domain._id.toString();
        const entries = await LeaderboardService.getFinalsLeaderboard(domainId);
        return { domainId, domainName: domain.name, entries };
      }),
    );

    const leaderboards: Record<string, unknown> = {};
    for (const result of results) {
      if (result.status === "fulfilled") {
        leaderboards[result.value.domainId] = {
          domainName: result.value.domainName,
          entries: result.value.entries,
        };
      }
    }

    return NextResponse.json(
      { leaderboards },
      {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      },
    );
  } catch (error) {
    console.error("Error fetching all finals leaderboards:", error);
    return NextResponse.json(
      { error: "Failed to fetch finals leaderboards" },
      { status: 500 },
    );
  }
}
