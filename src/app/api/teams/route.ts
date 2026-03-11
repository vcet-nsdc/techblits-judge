import { NextResponse } from "next/server";
import { storage } from "@/db/storage";
import { insertTeamSchema } from "@/db/schema";
import { z } from "zod";

export async function GET() {
  const teams = await storage.getTeams();
  return NextResponse.json(teams);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = insertTeamSchema.parse(body);
    const team = await storage.createTeam(input);
    return NextResponse.json(team, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return NextResponse.json({
        message: firstError.message,
        field: firstError.path.join("."),
      }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
