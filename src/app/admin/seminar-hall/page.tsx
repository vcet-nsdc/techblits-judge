"use client";
import React, { useEffect, useState } from "react";
import { Trophy, Medal, Award, RefreshCw, Edit2 } from "lucide-react";

interface DomainInfo {
  _id: string;
  name: string;
}

interface QualifiedTeam {
  _id: string;
  name: string;
  currentScore: number;
  finalScore: number | null;
  members: { name: string }[];
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
  judgeCount?: number;
}

export default function AdminSeminarHallPage() {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [qualifiers, setQualifiers] = useState<Record<string, QualifiedTeam[]>>({});
  const [finalsLeaderboards, setFinalsLeaderboards] = useState<Record<string, { domainName: string; entries: LeaderboardEntry[] }>>({});
  const [totalQualified, setTotalQualified] = useState(0);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchAll();
    const interval = setInterval(() => { if (token) fetchAll(); }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  async function fetchAll() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [qualRes, domainsRes, finalsRes] = await Promise.all([
        fetch("/api/admin/seminar-hall/qualifiers", { headers }),
        fetch("/api/domains"),
        fetch("/api/leaderboards/finals/all"),
      ]);

      const qualData = await qualRes.json();
      const domainsData = await domainsRes.json();
      const finalsData = await finalsRes.json();

      setQualifiers(qualData.qualifiers || {});
      setTotalQualified(qualData.totalQualified || 0);
      setDomains(domainsData.domains || domainsData || []);
      setFinalsLeaderboards(finalsData.leaderboards || {});
    } catch (error) {
      console.error("Error fetching seminar hall data:", error);
    } finally {
      setLoading(false);
    }
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold">#{rank}</span>;
  };

  if (loading) {
    return <div className="p-8 font-display text-2xl animate-pulse">LOADING SEMINAR HALL...</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">SEMINAR HALL</h1>
        <button onClick={fetchAll} className="text-gray-500 hover:text-[#ff1a1a] p-2" title="Refresh">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-[#ff1a1a] text-white rounded-lg p-4 text-center">
        <p className="font-heading text-xl">🏟️ {totalQualified} teams qualified for Seminar Hall Finals</p>
      </div>

      {/* Qualified Teams per Domain */}
      <div>
        <h2 className="font-heading text-xl mb-4">Qualified Teams by Domain</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(qualifiers).map(([domainName, teams]) => (
            <div key={domainName} className="bg-white border rounded-lg p-4">
              <h3 className="font-heading text-lg text-center mb-3 bg-black text-white p-2 rounded">
                {domainName}
              </h3>
              {teams.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No qualifiers yet</p>
              ) : (
                <div className="space-y-2">
                  {teams.map((team, i) => (
                    <div key={team._id} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <p className="font-heading text-sm">{team.name}</p>
                        <p className="text-xs text-gray-500">{team.members?.length || 0} members</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-[#ff1a1a]">Lab: {team.currentScore}</p>
                        {team.finalScore !== null && (
                          <p className="text-xs text-green-600">Finals: {team.finalScore}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Finals Leaderboards */}
      <div>
        <h2 className="font-heading text-xl mb-4">Finals Scores (Live)</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(finalsLeaderboards).map(([domainId, { domainName, entries }]) => (
            <div key={domainId} className="bg-white border rounded-lg p-4">
              <h3 className="font-heading text-lg text-center mb-3 bg-[#ff1a1a] text-white p-2 rounded">
                {domainName}
              </h3>
              {entries.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No finals scores yet</p>
              ) : (
                <div className="space-y-1">
                  {entries.map((entry) => (
                    <div key={entry.teamId} className="flex items-center justify-between px-2 py-1">
                      <div className="flex items-center gap-2">
                        {rankIcon(entry.rank)}
                        <span className="text-sm">{entry.teamName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#ff1a1a]">{entry.totalScore}</span>
                        {entry.judgeCount && (
                          <span className="text-xs text-gray-400 ml-1">({entry.judgeCount}j)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
