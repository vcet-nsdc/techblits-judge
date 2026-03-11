import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeamMember {
  name: string;
  email: string;
  role: 'leader' | 'member';
  attended?: boolean;
  attendance?: Record<string, boolean>;
}

export interface ITeam extends Document {
  name: string;
  labId: Types.ObjectId;
  domainId: Types.ObjectId;
  members: ITeamMember[];
  currentScore: number;
  rank?: number;
  qualifiedForFinals: boolean;
  finalVenueId: Types.ObjectId | null;
  finalScore: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['leader', 'member'], default: 'member' },
  attended: { type: Boolean, default: false },
  attendance: { type: Map, of: Boolean, default: undefined }
});

const TeamSchema: Schema = new Schema({
  name: { type: String, required: true },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  members: [TeamMemberSchema],
  currentScore: { type: Number, default: 0 },
  rank: { type: Number },
  qualifiedForFinals: { type: Boolean, default: false },
  finalVenueId: { type: Schema.Types.ObjectId, ref: 'Lab', default: null },
  finalScore: { type: Number, default: null },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

// Indexes for performance
TeamSchema.index({ labId: 1 });
TeamSchema.index({ domainId: 1 });
TeamSchema.index({ qualifiedForFinals: 1, domainId: 1 });
TeamSchema.index({ name: 1, isActive: 1 });

export const Team = mongoose.models.Team as mongoose.Model<ITeam> || mongoose.model<ITeam>('Team', TeamSchema);
