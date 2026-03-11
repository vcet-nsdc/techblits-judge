import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { Judge } from "@/models/Judge";
import { JudgeRole } from "@/models/Judge";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);
    const { username, password } = input;

    if (!username.trim() || !password.trim()) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // Try to find a matching judge in MongoDB (by email or name)
    let judgeRole: string = JudgeRole.LAB_ROUND;
    let isSeminarHallJudge = false;
    try {
      const judge = await Judge.findOne({
        $or: [{ email: username }, { name: username }],
        isActive: true
      });
      if (judge) {
        judgeRole = judge.role;
        isSeminarHallJudge = judge.role === JudgeRole.SEMINAR_HALL;
      }
    } catch {
      // MongoDB unavailable — proceed with mock defaults
    }

    const cookieStore = await cookies();
    cookieStore.set("judgeId", username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    cookieStore.set("judgeRole", judgeRole, {
      httpOnly: false, // readable by client JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return NextResponse.json({
      message: "Logged in successfully",
      judgeId: username,
      judgeRole,
      isSeminarHallJudge
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
}
