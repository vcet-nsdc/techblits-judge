import mongoose, { Schema, Document, Types } from 'mongoose';
import { CompetitionRound } from '@/types/competition';

export interface IScoringCriterion {
  name: string;
  marks: number;
}

export interface IScore extends Document {
  teamId: Types.ObjectId;
  judgeId: Types.ObjectId;
  domainId: Types.ObjectId;
  venueId: Types.ObjectId;
  round: CompetitionRound;
  marks: number;
  criteria?: IScoringCriterion[];
  feedback?: string;
  submittedAt: Date;
  updatedAt: Date;
}

const ScoreSchema: Schema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  judgeId: { type: Schema.Types.ObjectId, ref: 'Judge', required: true },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  venueId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  round: { type: String, enum: ['lab_round', 'finals'], required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  criteria: [{
    name: { type: String },
    marks: { type: Number, min: 0, max: 100 }
  }],
  feedback: { type: String, maxlength: 1000 },
  submittedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

// Indexes for performance
ScoreSchema.index({ teamId: 1, domainId: 1, round: 1 });
ScoreSchema.index({ venueId: 1, round: 1 });
ScoreSchema.index({ judgeId: 1 });
ScoreSchema.index({ submittedAt: 1 });

export const Score = mongoose.models.Score as mongoose.Model<IScore> || mongoose.model<IScore>('Score', ScoreSchema);
