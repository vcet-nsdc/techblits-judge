import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeamMember {
  name: string;
  email?: string;
  role: 'leader' | 'member';
  attended?: boolean;
  attendance?: Record<string, boolean>;
}

export interface ITeam extends Document {
  name: string;
  labId: Types.ObjectId;
  domainId: Types.ObjectId;
  problemStatement?: string;
  githubRepo?: string;
  figmaLink?: string | null;
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
  email: { type: String, default: '' },
  role: { type: String, enum: ['leader', 'member'], default: 'member' },
  attended: { type: Boolean, default: false },
  attendance: { type: Map, of: Boolean, default: undefined }
});

const TeamSchema: Schema = new Schema({
  name: { type: String, required: true },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  problemStatement: { type: String, default: '' },
  githubRepo: { type: String, default: '' },
  figmaLink: { type: String, default: null },
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

// Drop legacy indexes not in current schema (e.g. stale `id_1` from old db/models.ts)
if (!mongoose.models._teamIndexesSynced) {
  Team.syncIndexes().catch(() => {});
  (mongoose.models as Record<string, unknown>)._teamIndexesSynced = true;
}
