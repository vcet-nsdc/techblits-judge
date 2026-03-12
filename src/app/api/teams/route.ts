import { NextResponse } from "next/server";
import { storage } from "@/db/storage";
import { insertTeamSchema, type InsertTeam } from "@/db/schema";
import { connectDB } from "@/lib/mongodb";
import { Domain } from "@/models/Domain";
import { Lab } from "@/models/Lab";
import { Team as CompetitionTeam } from "@/models/Team";
import { VenueType } from "@/types/competition";
import { z } from "zod";

async function syncRegisteredTeamToCompetitionCollection(input: InsertTeam) {
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
          assignedDomain: input.domain,
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

  if (lab.assignedDomain && lab.assignedDomain !== input.domain) {
    throw new Error(`Lab ${input.lab} is not assigned to ${input.domain}`);
  }

  const members = input.members.map((memberName, index) => ({
    name: memberName.trim(),
    email: "",
    role: index === 0 ? "leader" : "member",
  }));

  await CompetitionTeam.findOneAndUpdate(
    { name: input.name.trim(), isActive: true },
    {
      $set: {
        name: input.name.trim(),
        labId: lab._id,
        domainId: domain._id,
        members,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    }
  );
}

export async function GET() {
  const teams = await storage.getTeams();
  return NextResponse.json(teams);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = insertTeamSchema.parse(body);
    const team = await storage.createTeam(input);

    try {
      await syncRegisteredTeamToCompetitionCollection(input);
    } catch (syncError) {
      console.error("Registration sync to competition collection failed:", syncError);
    }

    return NextResponse.json(team, { status: 201 });
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
