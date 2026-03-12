import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Domain } from "@/models/Domain";
import { Lab } from "@/models/Lab";
import { Team } from "@/models/Team";
import { VenueType } from "@/types/competition";
import { z } from "zod";

const insertTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  domain: z.string().min(1, "Battle domain is required"),
  problemStatement: z.string().min(1, "Problem statement is required"),
  lab: z.string().min(1, "Assigned lab is required"),
  githubRepo: z.string().min(1, "Repository link is required"),
  figmaLink: z.string().optional(),
  members: z.array(z.string().min(1, "Member name cannot be empty")).min(1, "At least one member is required"),
});

type InsertTeam = z.infer<typeof insertTeamSchema>;

async function registerTeam(input: InsertTeam) {
  await connectDB();

  const [domain, lab] = await Promise.all([
    Domain.findOneAndUpdate(
      { name: input.domain },
      {
        $setOnInsert: {
          name: input.domain,
          description: `${input.domain} competition domain`,
          scoringCriteria: [],
        },
        $set: {
          isActive: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    ),
    Lab.findOneAndUpdate(
      { name: input.lab },
      {
        $setOnInsert: {
          name: input.lab,
          location: input.lab,
          type: VenueType.LAB,
          capacity: 50,
        },
        $set: {
          assignedDomain: undefined,
          isActive: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    ),
  ]);

  if (!domain || !lab) {
    throw new Error("Unable to prepare registration metadata for team sync");
  }

  if (!lab.assignedDomain || lab.assignedDomain.toString() !== domain._id.toString()) {
    await Lab.findByIdAndUpdate(lab._id, { $set: { assignedDomain: domain._id } });
  }

  const members = input.members.map((memberName, index) => ({
    name: memberName.trim(),
    email: "",
    role: index === 0 ? "leader" : "member",
  }));

  const team = await Team.findOneAndUpdate(
    { name: input.name.trim(), isActive: true },
    {
      $set: {
        name: input.name.trim(),
        labId: lab._id,
        domainId: domain._id,
        problemStatement: input.problemStatement,
        githubRepo: input.githubRepo,
        figmaLink: input.figmaLink ?? null,
        members,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    }
  );

  return team;
}

export async function GET() {
  try {
    await connectDB();
    const teams = await Team.find({ isActive: true })
      .populate('labId', 'name type')
      .populate('domainId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      teams.map(team => ({
        id: team._id.toString(),
        name: team.name,
        domain: (team.domainId as { name?: string })?.name || '',
        lab: (team.labId as { name?: string })?.name || '',
        problemStatement: team.problemStatement || '',
        githubRepo: team.githubRepo || '',
        figmaLink: team.figmaLink ?? null,
        members: team.members?.map(m => m.name) || [],
        currentScore: team.currentScore || 0,
        createdAt: team.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ message: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = insertTeamSchema.parse(body);
    const team = await registerTeam(input);

    return NextResponse.json({
      success: true,
      team: {
        id: team?._id.toString(),
        name: team?.name,
      }
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return NextResponse.json({
        message: firstError.message,
        field: firstError.path.join("."),
      }, { status: 400 });
    }

    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Team registration failed:", err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
