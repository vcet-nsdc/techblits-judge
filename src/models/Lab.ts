import mongoose, { Schema, Document } from 'mongoose';
import { VenueType } from '@/types/competition';

export interface ILab extends Document {
  name: string;
  location?: string;
  type: VenueType;
  capacity: number;
  assignedDomain?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true
  },
  location: { type: String },
  type: {
    type: String,
    enum: Object.values(VenueType),
    default: VenueType.LAB
  },
  capacity: { type: Number, default: 50 },
  assignedDomain: { type: String, default: null },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

// Index for fast venue-type queries
LabSchema.index({ type: 1 });

export const Lab = mongoose.models.Lab as mongoose.Model<ILab> || mongoose.model<ILab>('Lab', LabSchema);
