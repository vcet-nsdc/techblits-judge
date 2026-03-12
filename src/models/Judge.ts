import mongoose, { Schema, Document, Types } from 'mongoose';

export enum JudgeRole {
  LAB_ROUND = 'lab_round',
  SEMINAR_HALL = 'seminar_hall',
  ADMIN = 'admin'
}

export interface IJudge extends Document {
  name: string;
  email: string;
  passwordHash: string;
  assignedLabId: Types.ObjectId;
  assignedDomains: Types.ObjectId[];
  role: JudgeRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JudgeSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  assignedLabId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  assignedDomains: [{ type: Schema.Types.ObjectId, ref: 'Domain' }],
  role: { type: String, enum: Object.values(JudgeRole), default: JudgeRole.LAB_ROUND },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date }
}, { 
  timestamps: true 
});

// Indexes for performance
JudgeSchema.index({ assignedLabId: 1 });
JudgeSchema.index({ role: 1 });

export const Judge = mongoose.models.Judge as mongoose.Model<IJudge> || mongoose.model<IJudge>('Judge', JudgeSchema);
