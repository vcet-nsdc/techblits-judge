import mongoose, { Schema, Document, Types } from 'mongoose';
import { CompetitionRound } from '@/types/competition';

export interface ICompetition extends Document {
  name: string;
  currentRound: CompetitionRound;
  seminarHallId?: Types.ObjectId;
  qualifiedTeamsPerDomain: number;
  labRoundStartTime?: Date;
  labRoundEndTime?: Date;
  finalsStartTime?: Date;
  finalsEndTime?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionSchema: Schema = new Schema({
  name: { type: String, required: true },
  currentRound: { type: String, enum: ['lab_round', 'finals'], default: 'lab_round' },
  seminarHallId: { type: Schema.Types.ObjectId, ref: 'Lab' },
  qualifiedTeamsPerDomain: { type: Number, default: 5 },
  labRoundStartTime: { type: Date },
  labRoundEndTime: { type: Date },
  finalsStartTime: { type: Date },
  finalsEndTime: { type: Date },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

export const Competition = mongoose.models.Competition as mongoose.Model<ICompetition> || mongoose.model<ICompetition>('Competition', CompetitionSchema);
