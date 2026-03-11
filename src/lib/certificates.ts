import { Team, type ITeamMember } from '@/models/Team';
import { CertificateAuditLog } from '@/models/CertificateAuditLog';
import { connectDB } from '@/lib/mongodb';

type CertificateEndpoint = 'hidden_generate' | 'search_trigger';

export interface GeneratedCertificate {
  memberName: string;
  teamName: string;
  sessionKey: string;
  attendanceConfirmed: true;
  issuedAt: string;
  fileName: string;
  mimeType: 'image/svg+xml';
  contentBase64: string;
  downloadDataUrl: string;
}

export interface CertificateGenerationResult {
  teamId: string;
  teamName: string;
  sessionKey: string;
  generatedCount: number;
  certificates: GeneratedCertificate[];
}

interface GenerationInput {
  teamName: string;
  sessionKey?: string;
  actor: string;
  endpoint: CertificateEndpoint;
  requestedByIp?: string;
}

function normalize(text: string): string {
  return text.trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toDateLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAnySessionAttendance(attendance?: Record<string, boolean> | Map<string, boolean>): boolean {
  if (!attendance) return false;

  if (attendance instanceof Map) {
    return Array.from(attendance.values()).some(Boolean);
  }

  return Object.values(attendance).some(Boolean);
}

function isAttendedForSession(member: ITeamMember, sessionKey: string): boolean {
  if (member.attended) {
    return true;
  }

  if (!member.attendance) {
    return false;
  }

  if (member.attendance instanceof Map) {
    const sessionAttendance = member.attendance.get(sessionKey);
    if (typeof sessionAttendance === 'boolean') {
      return sessionAttendance;
    }
    return sessionKey === 'default_session' ? hasAnySessionAttendance(member.attendance) : false;
  }

  if (typeof member.attendance[sessionKey] === 'boolean') {
    return member.attendance[sessionKey] === true;
  }

  return sessionKey === 'default_session' ? hasAnySessionAttendance(member.attendance) : false;
}

function renderCertificateSvg(memberName: string, teamName: string, issuedAtIso: string): string {
  const issuedDate = toDateLabel(issuedAtIso);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990" role="img" aria-label="Attendance certificate">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbf7e9" />
      <stop offset="100%" stop-color="#f0e7ca" />
    </linearGradient>
  </defs>
  <rect width="1400" height="990" fill="url(#bg)" />
  <rect x="40" y="40" width="1320" height="910" fill="none" stroke="#1f2937" stroke-width="8"/>
  <rect x="70" y="70" width="1260" height="850" fill="none" stroke="#a16207" stroke-width="3"/>

  <text x="700" y="185" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="#111827">Certificate of Attendance</text>
  <text x="700" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#374151">This certifies that</text>

  <text x="700" y="370" text-anchor="middle" font-family="Georgia, serif" font-size="62" fill="#0f172a" font-weight="700">${escapeXml(memberName)}</text>

  <text x="700" y="455" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#374151">from team</text>
  <text x="700" y="525" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#111827">${escapeXml(teamName)}</text>

  <text x="700" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#374151">has been marked present for the event session.</text>

  <line x1="210" y1="790" x2="560" y2="790" stroke="#111827" stroke-width="2" />
  <text x="385" y="825" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#374151">Attendance Confirmed</text>

  <line x1="840" y1="790" x2="1190" y2="790" stroke="#111827" stroke-width="2" />
  <text x="1015" y="825" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#374151">Issued ${escapeXml(issuedDate)}</text>
</svg>`;
}

async function writeAuditLog(input: {
  endpoint: CertificateEndpoint;
  actor: string;
  teamName: string;
  sessionKey: string;
  requestedByIp?: string;
  generatedCount: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    await CertificateAuditLog.create({
      endpoint: input.endpoint,
      actor: input.actor,
      teamName: input.teamName,
      sessionKey: input.sessionKey,
      requestedByIp: input.requestedByIp,
      generatedCount: input.generatedCount,
      success: input.success,
      errorMessage: input.errorMessage,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Certificate audit log write failed:', error);
  }
}

export async function searchTeamsByName(query: string, limit = 10): Promise<Array<{ id: string; name: string }>> {
  await connectDB();

  const normalized = normalize(query);
  if (!normalized) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 25);

  const teams = await Team.find(
    {
      isActive: true,
      name: { $regex: normalized, $options: 'i' }
    },
    { _id: 1, name: 1 }
  )
    .sort({ name: 1 })
    .limit(safeLimit)
    .lean();

  return teams.map((team) => ({ id: team._id.toString(), name: team.name }));
}

export async function generateCertificatesForTeam(input: GenerationInput): Promise<CertificateGenerationResult> {
  const normalizedTeamName = normalize(input.teamName);
  const sessionKey = normalize(input.sessionKey || 'default_session');

  await connectDB();

  try {
    const team = await Team.findOne(
      {
        isActive: true,
        name: { $regex: `^${escapeRegex(normalizedTeamName)}$`, $options: 'i' }
      },
      { _id: 1, name: 1, members: 1 }
    ).lean();

    if (!team) {
      await writeAuditLog({
        endpoint: input.endpoint,
        actor: input.actor,
        teamName: input.teamName,
        sessionKey,
        requestedByIp: input.requestedByIp,
        generatedCount: 0,
        success: false,
        errorMessage: 'Team not found'
      });
      throw new Error('Team not found');
    }

    const members = (team.members ?? []) as ITeamMember[];
    const attendedMembers = members.filter((member) => isAttendedForSession(member, sessionKey));

    if (attendedMembers.length === 0) {
      await writeAuditLog({
        endpoint: input.endpoint,
        actor: input.actor,
        teamName: team.name,
        sessionKey,
        requestedByIp: input.requestedByIp,
        generatedCount: 0,
        success: false,
        errorMessage: 'No attended members found for the selected session'
      });
      throw new Error('No attended members found for the selected session');
    }

    const issuedAt = new Date().toISOString();
    const certificates = attendedMembers.map((member, index) => {
      const svg = renderCertificateSvg(member.name, team.name, issuedAt);
      const contentBase64 = Buffer.from(svg, 'utf8').toString('base64');
      const baseName = `${slugify(team.name)}-${slugify(member.name) || `member-${index + 1}`}`;

      return {
        memberName: member.name,
        teamName: team.name,
        sessionKey,
        attendanceConfirmed: true as const,
        issuedAt,
        fileName: `${baseName}-attendance.svg`,
        mimeType: 'image/svg+xml' as const,
        contentBase64,
        downloadDataUrl: `data:image/svg+xml;base64,${contentBase64}`
      };
    });

    await writeAuditLog({
      endpoint: input.endpoint,
      actor: input.actor,
      teamName: team.name,
      sessionKey,
      requestedByIp: input.requestedByIp,
      generatedCount: certificates.length,
      success: true
    });

    return {
      teamId: team._id.toString(),
      teamName: team.name,
      sessionKey,
      generatedCount: certificates.length,
      certificates
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    await writeAuditLog({
      endpoint: input.endpoint,
      actor: input.actor,
      teamName: input.teamName,
      sessionKey,
      requestedByIp: input.requestedByIp,
      generatedCount: 0,
      success: false,
      errorMessage: 'Unexpected failure'
    });

    throw new Error('Failed to generate certificates');
  }
}
