"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/routes";
import { z } from "zod";

export function useEvaluations() {
  return useQuery({
    queryKey: [api.evaluations.list.path],
    queryFn: async () => {
      const res = await fetch(api.evaluations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      return api.evaluations.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.evaluations.create.input>) => {
      const validated = api.evaluations.create.input.parse(data);
      const res = await fetch(api.evaluations.create.path, {
        method: api.evaluations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit evaluation");
      }
      return api.evaluations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.evaluations.list.path] });
    },
  });
}
