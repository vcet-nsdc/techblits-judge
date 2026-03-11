import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(), // Agentic AI, Vibecoding, UI/UX Challenge
  problemStatement: text("problem_statement").notNull(),
  lab: text("lab").notNull(), // Lab A, Lab B, Lab C, Lab D
  githubRepo: text("github_repo").notNull(),
  figmaLink: text("figma_link"),
  members: jsonb("members").$type<string[]>().notNull(),
  gitScore: integer("git_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  judgeId: text("judge_id").notNull(),
  innovation: integer("innovation").notNull(),
  techComplexity: integer("tech_complexity").notNull(),
  uiUx: integer("ui_ux").notNull(),
  practicalImpact: integer("practical_impact").notNull(),
  presentation: integer("presentation").notNull(),
  totalScore: integer("total_score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams, {
  name: z.string().min(1, "Team name is required"),
  domain: z.string().min(1, "Battle domain is required"),
  problemStatement: z.string().min(1, "Problem statement is required"),
  lab: z.string().min(1, "Assigned lab is required"),
  githubRepo: z.string().min(1, "Repository link is required"),
  members: z.array(z.string().min(1, "Member name cannot be empty")).min(1, "At least one member is required"),
}).omit({ id: true, createdAt: true, gitScore: true });
export const insertEvaluationSchema = createInsertSchema(evaluations).omit({ id: true, createdAt: true, totalScore: true });

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
