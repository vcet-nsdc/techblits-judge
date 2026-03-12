"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export function useJudgeLogin() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const validated = loginSchema.parse(data);
      const res = await fetch("/api/judge/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validated.username,
          password: validated.password,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Invalid judge credentials");
      }
      const result = await res.json();
      const judge = result.judge;
      localStorage.setItem("judgeId", judge.id);
      localStorage.setItem("judgeRole", judge.role);
      localStorage.setItem("isSeminarHallJudge", String(judge.role === "seminar_hall"));
      if (result.token) {
        localStorage.setItem("judgeToken", result.token);
      }
      return {
        judgeId: judge.id,
        judgeRole: judge.role,
        isSeminarHallJudge: judge.role === "seminar_hall",
      };
    },
  });
}

export function useJudgeLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/judge/logout", { method: "POST", credentials: "include" });
      localStorage.removeItem("judgeId");
      localStorage.removeItem("judgeRole");
      localStorage.removeItem("isSeminarHallJudge");
      localStorage.removeItem("judgeToken");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    }
  });
}

export function getJudgeId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("judgeId");
}

export function getJudgeRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("judgeRole");
}

export function isSeminarHallJudge(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("isSeminarHallJudge") === "true" ||
    localStorage.getItem("judgeRole") === "seminar_hall";
}
