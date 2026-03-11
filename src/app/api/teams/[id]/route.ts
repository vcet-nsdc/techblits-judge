import { NextResponse } from "next/server";
import { storage } from "@/db/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const idStr = (await params).id;
  const team = await storage.getTeam(Number(idStr));
  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 });
  }
  return NextResponse.json(team);
}
