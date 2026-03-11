"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/routes";
import { z } from "zod";

export function useJudgeLogin() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.auth.login.input>) => {
      const validated = api.auth.login.input.parse(data);
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Invalid judge credentials");
      }
      const result = api.auth.login.responses[200].parse(await res.json());
      localStorage.setItem("judgeId", result.judgeId);
      if (result.judgeRole) localStorage.setItem("judgeRole", result.judgeRole);
      if (result.isSeminarHallJudge !== undefined) {
        localStorage.setItem("isSeminarHallJudge", String(result.isSeminarHallJudge));
      }
      return result;
    },
  });
}

export function useJudgeLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: api.auth.logout.method, credentials: "include" });
      localStorage.removeItem("judgeId");
      localStorage.removeItem("judgeRole");
      localStorage.removeItem("isSeminarHallJudge");
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
