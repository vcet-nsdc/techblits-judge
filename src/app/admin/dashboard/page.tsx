"use client";
import React, { useEffect, useState } from "react";
import { Trophy, Users, Building2, Medal, Award } from "lucide-react";

interface DomainInfo {
  _id: string;
  name: string;
}

interface TeamInfo {
  _id: string;
  name: string;
  domainId: { _id: string; name: string } | string;
  labId: { _id: string; name: string } | string;
  members: { name: string; email: string; role: string; attended?: boolean }[];
  currentScore: number;
  qualifiedForFinals: boolean;
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
}

export default function AdminDashboardPage() {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [leaderboards, setLeaderboards] = useState<
    Record<string, LeaderboardEntry[]>
  >({});
  const [competitionStatus, setCompetitionStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  async function fetchAllData() {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [domainsRes, teamsRes, statusRes] = await Promise.all([
        fetch("/api/domains"),
        fetch("/api/admin/teams", { headers }),
        fetch("/api/competition/status"),
      ]);

      const domainsData = await domainsRes.json();
      const teamsData = await teamsRes.json();
      const statusData = await statusRes.json();

      const domainList = domainsData.domains || domainsData || [];
      setDomains(domainList);
      setTeams(teamsData.teams || []);
      setCompetitionStatus(statusData);

      // Fetch all leaderboards in parallel instead of sequentially
      const leaderboardResults = await Promise.allSettled(
        domainList.map(async (domain: DomainInfo) => {
          const res = await fetch(`/api/leaderboards/${domain._id}/lab_round`);
          const data = await res.json();
          const lb = data.leaderboard ?? data;
          return { domainId: domain._id, entries: Array.isArray(lb) ? lb : [] };
        }),
      );

      const boards: Record<string, LeaderboardEntry[]> = {};
      for (const result of leaderboardResults) {
        if (result.status === "fulfilled") {
          boards[result.value.domainId] = result.value.entries;
        }
      }
      setLeaderboards(boards);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalTeams = teams.length;
  const totalParticipants = teams.reduce(
    (acc, t) => acc + (t.members?.length || 0),
    0,
  );
  const qualifiedTeams = teams.filter((t) => t.qualifiedForFinals).length;
  const teamsPerDomain: Record<string, number> = {};
  for (const team of teams) {
    const dId =
      typeof team.domainId === "object" ? team.domainId.name : team.domainId;
    teamsPerDomain[dId] = (teamsPerDomain[dId] || 0) + 1;
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="font-display text-2xl animate-pulse">
          LOADING DASHBOARD...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="font-display text-4xl">ADMIN DASHBOARD</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Teams"
          value={totalTeams}
          icon={<Users className="h-8 w-8 text-blue-500" />}
        />
        <StatCard
          label="Participants"
          value={totalParticipants}
          icon={<Users className="h-8 w-8 text-green-500" />}
        />
        <StatCard
          label="Qualified for Finals"
          value={qualifiedTeams}
          icon={<Trophy className="h-8 w-8 text-yellow-500" />}
        />
        <StatCard
          label="Current Round"
          value={(competitionStatus?.currentRound as string) || "N/A"}
          icon={<Building2 className="h-8 w-8 text-purple-500" />}
          isText
        />
      </div>

      {/* Teams per domain */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-heading text-xl mb-4">Teams per Domain</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(teamsPerDomain).map(([domain, count]) => (
            <div key={domain} className="bg-gray-50 rounded p-4 text-center">
              <p className="font-heading text-lg">{domain}</p>
              <p className="font-display text-3xl text-[#ff1a1a]">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Morning Registrations */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-heading text-xl mb-4">Recent Registrations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-heading">Team Name</th>
                <th className="text-left p-3 font-heading">Members</th>
                <th className="text-left p-3 font-heading">Domain</th>
                <th className="text-left p-3 font-heading">Lab</th>
              </tr>
            </thead>
            <tbody>
              {teams.slice(0, 20).map((team) => (
                <tr key={team._id} className="border-t">
                  <td className="p-3 font-semibold">{team.name}</td>
                  <td className="p-3">{team.members?.length || 0}</td>
                  <td className="p-3">
                    {typeof team.domainId === "object"
                      ? team.domainId.name
                      : "—"}
                  </td>
                  <td className="p-3">
                    {typeof team.labId === "object" ? team.labId.name : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lab Round Leaderboards */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-heading text-xl mb-4">Lab Round Leaderboards</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {domains.map((domain) => {
            const entries = leaderboards[domain._id] || [];
            return (
              <div key={domain._id} className="border rounded p-4">
                <h3 className="font-heading text-lg text-center mb-3 bg-black text-white p-2 rounded">
                  {domain.name}
                </h3>
                {entries.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No scores</p>
                ) : (
                  <div className="space-y-1">
                    {entries.slice(0, 10).map((entry) => (
                      <div
                        key={entry.teamId}
                        className="flex items-center justify-between px-2 py-1"
                      >
                        <div className="flex items-center gap-2">
                          {rankIcon(entry.rank)}
                          <span className="text-sm">{entry.teamName}</span>
                        </div>
                        <span className="font-bold text-[#ff1a1a]">
                          {entry.totalScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Seminar Hall Panel */}
      {qualifiedTeams > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-heading text-xl mb-4">
            Seminar Hall — Qualified Teams
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {domains.map((domain) => {
              const qualified = teams.filter(
                (t) =>
                  t.qualifiedForFinals &&
                  (typeof t.domainId === "object"
                    ? t.domainId._id
                    : t.domainId) === domain._id,
              );
              return (
                <div key={domain._id} className="border rounded p-4">
                  <h3 className="font-heading text-lg text-center mb-3 bg-[#ff1a1a] text-white p-2 rounded">
                    {domain.name}
                  </h3>
                  {qualified.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">
                      No qualifiers
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {qualified.map((team) => (
                        <div
                          key={team._id}
                          className="flex items-center justify-between px-2 py-1 text-sm"
                        >
                          <span>{team.name}</span>
                          <span className="text-[#ff1a1a] font-bold">
                            {team.currentScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isText = false,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  isText?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
      {icon}
      <div>
        <p className="text-gray-500 text-sm font-body">{label}</p>
        <p
          className={`font-display ${isText ? "text-lg" : "text-3xl"} text-gray-900`}
        >
          {typeof value === "string"
            ? value.replace("_", " ").toUpperCase()
            : value}
        </p>
      </div>
    </div>
  );
}
