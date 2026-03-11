import mongoose, { Schema, Document } from 'mongoose';

export interface IDomain extends Document {
  name: string;
  description?: string;
  scoringCriteria: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: { type: String },
  scoringCriteria: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

export const Domain = mongoose.models.Domain as mongoose.Model<IDomain> || mongoose.model<IDomain>('Domain', DomainSchema);
