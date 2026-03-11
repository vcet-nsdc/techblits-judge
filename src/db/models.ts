import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for Team
export interface ITeam extends Document {
  id: number;
  name: string;
  domain: string;
  problemStatement: string;
  lab: string;
  githubRepo: string;
  figmaLink: string | null;
  members: string[];
  gitScore: number;
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    domain: { type: String, required: true },
    problemStatement: { type: String, required: true },
    lab: { type: String, required: true },
    githubRepo: { type: String, required: true },
    figmaLink: { type: String, default: null },
    members: { type: [String], required: true },
    gitScore: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "teams" }
);

export const TeamModel: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

// Interface for Evaluation
export interface IEvaluation extends Document {
  id: number;
  teamId: number;
  judgeId: string;
  innovation: number;
  techComplexity: number;
  uiUx: number;
  practicalImpact: number;
  presentation: number;
  totalScore: number;
  createdAt: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    id: { type: Number, required: true, unique: true },
    teamId: { type: Number, required: true },
    judgeId: { type: String, required: true },
    innovation: { type: Number, required: true },
    techComplexity: { type: Number, required: true },
    uiUx: { type: Number, required: true },
    practicalImpact: { type: Number, required: true },
    presentation: { type: Number, required: true },
    totalScore: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "evaluations" }
);

export const EvaluationModel: Model<IEvaluation> =
  mongoose.models.Evaluation ||
  mongoose.model<IEvaluation>("Evaluation", EvaluationSchema);
