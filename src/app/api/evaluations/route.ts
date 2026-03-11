import { NextResponse } from "next/server";
import { storage } from "@/db/storage";
import { insertEvaluationSchema } from "@/db/schema";
import { z } from "zod";

export async function GET() {
  const evals = await storage.getEvaluations();
  return NextResponse.json(evals);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = insertEvaluationSchema.extend({
      teamId: z.coerce.number(),
      innovation: z.coerce.number(),
      techComplexity: z.coerce.number(),
      uiUx: z.coerce.number(),
      practicalImpact: z.coerce.number(),
      presentation: z.coerce.number(),
    }).parse(body);

    const evaluation = await storage.createEvaluation(input);
    return NextResponse.json(evaluation, { status: 201 });
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
