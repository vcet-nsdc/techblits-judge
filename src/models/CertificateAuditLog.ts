import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificateAuditLog extends Document {
  endpoint: 'hidden_generate' | 'search_trigger';
  actor: string;
  teamName: string;
  sessionKey?: string;
  requestedByIp?: string;
  generatedCount: number;
  success: boolean;
  errorMessage?: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateAuditLogSchema: Schema = new Schema({
  endpoint: { type: String, enum: ['hidden_generate', 'search_trigger'], required: true },
  actor: { type: String, required: true },
  teamName: { type: String, required: true },
  sessionKey: { type: String },
  requestedByIp: { type: String },
  generatedCount: { type: Number, default: 0 },
  success: { type: Boolean, required: true },
  errorMessage: { type: String },
  generatedAt: { type: Date, required: true }
}, {
  timestamps: true
});

CertificateAuditLogSchema.index({ teamName: 1, generatedAt: -1 });
CertificateAuditLogSchema.index({ actor: 1, generatedAt: -1 });
CertificateAuditLogSchema.index({ endpoint: 1, generatedAt: -1 });

export const CertificateAuditLog =
  mongoose.models.CertificateAuditLog as mongoose.Model<ICertificateAuditLog> ||
  mongoose.model<ICertificateAuditLog>('CertificateAuditLog', CertificateAuditLogSchema);
