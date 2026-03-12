import mongoose, { Schema, Document } from 'mongoose';

export interface ICertificateConfig extends Document {
  templateImagePath: string;
  nameX: number;
  nameY: number;
  nameSize: number;
  nameColor: string;
  teamX: number;
  teamY: number;
  teamSize: number;
  teamColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateConfigSchema = new Schema({
  templateImagePath: { type: String, required: true },
  nameX: { type: Number, default: 700 },
  nameY: { type: Number, default: 370 },
  nameSize: { type: Number, default: 56 },
  nameColor: { type: String, default: '#0f172a' },
  teamX: { type: Number, default: 700 },
  teamY: { type: Number, default: 480 },
  teamSize: { type: Number, default: 40 },
  teamColor: { type: String, default: '#374151' },
}, { timestamps: true });

export const CertificateConfig =
  mongoose.models.CertificateConfig as mongoose.Model<ICertificateConfig> ||
  mongoose.model<ICertificateConfig>('CertificateConfig', CertificateConfigSchema);
