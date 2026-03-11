import { connectDB } from '@/lib/mongodb';
import { Lab } from './Lab';
import { Domain } from './Domain';
import { Team } from './Team';
import { Judge } from './Judge';
import { Score } from './Score';
import { Competition } from './Competition';
import { CertificateAuditLog } from './CertificateAuditLog';

// Initialize database connection
connectDB().catch(console.error);

export {
  Lab,
  Domain,
  Team,
  Judge,
  Score,
  Competition,
  CertificateAuditLog
};

export * from './Lab';
export * from './Domain';
export * from './Team';
export * from './Judge';
export * from './Score';
export * from './Competition';
export * from './CertificateAuditLog';
