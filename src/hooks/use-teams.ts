"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Registration schema matching what the /api/teams POST endpoint expects
const insertTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  domain: z.string().min(1, "Battle domain is required"),
  problemStatement: z.string().min(1, "Problem statement is required"),
  lab: z.string().min(1, "Assigned lab is required"),
  githubRepo: z.string().min(1, "Repository link is required"),
  figmaLink: z.string().optional(),
  members: z.array(z.string().min(1, "Member name cannot be empty")).min(1, "At least one member is required"),
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export { insertTeamSchema };

export function useTeams() {
  return useQuery({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTeam) => {
      const validated = insertTeamSchema.parse(data);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to register team");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });
}
