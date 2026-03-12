import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Team } from "@/models/Team";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const team = await Team.findById(id)
      .populate('labId', 'name type')
      .populate('domainId', 'name')
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: team._id.toString(),
      name: team.name,
      domain: (team.domainId as { name?: string })?.name || '',
      lab: (team.labId as { name?: string })?.name || '',
      problemStatement: team.problemStatement || '',
      githubRepo: team.githubRepo || '',
      figmaLink: team.figmaLink ?? null,
      members: team.members?.map(m => m.name) || [],
      currentScore: team.currentScore || 0,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ message: "Failed to fetch team" }, { status: 500 });
  }
}
