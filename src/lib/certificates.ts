import { Team, type ITeamMember } from '@/models/Team';
import { CertificateConfig } from '@/models/CertificateConfig';
import { connectDB } from '@/lib/mongodb';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchTeamsByName(query: string, limit = 10) {
  await connectDB();
  const normalized = query.trim();
  if (!normalized) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 25);
  const teams = await Team.find(
    { isActive: true, name: { $regex: escapeRegex(normalized), $options: 'i' } },
    { _id: 1, name: 1 }
  ).sort({ name: 1 }).limit(safeLimit).lean();

  return teams.map(t => ({ id: t._id.toString(), name: t.name }));
}

export async function getCertificateConfig() {
  await connectDB();
  return CertificateConfig.findOne().sort({ updatedAt: -1 }).lean();
}

export async function getTeamAttendedMembers(teamName: string) {
  await connectDB();

  const team = await Team.findOne(
    {
      isActive: true,
      name: { $regex: `^${escapeRegex(teamName.trim())}$`, $options: 'i' }
    },
    { _id: 1, name: 1, members: 1 }
  ).lean();

  if (!team) throw new Error('Team not found');

  const members = (team.members ?? []) as ITeamMember[];
  const attended = members.filter(m => m.attended === true);

  if (attended.length === 0) throw new Error('No attended members found for this team');

  return {
    teamName: team.name,
    members: attended.map(m => ({ name: m.name })),
  };
}
