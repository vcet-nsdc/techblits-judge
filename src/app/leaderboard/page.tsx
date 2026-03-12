"use client";
import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SectionTitle } from "@/components/ComicUI";
import { Trophy, Medal, Award, ArrowRight } from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
  judgeCount?: number;
}

interface DomainInfo {
  _id: string;
  name: string;
  description?: string;
}

export default function LeaderboardPage() {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [competitionStatus, setCompetitionStatus] = useState<{ currentRound: string } | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [domainsRes, statusRes] = await Promise.all([
        fetch("/api/domains"),
        fetch("/api/competition/status")
      ]);
      
      const domainsData = await domainsRes.json();
      const statusData = await statusRes.json();
      
      const domainList: DomainInfo[] = domainsData.domains || domainsData || [];
      setDomains(domainList);
      setCompetitionStatus(statusData);
      
      const boards: Record<string, LeaderboardEntry[]> = {};
      for (const domain of domainList) {
        const res = await fetch(`/api/leaderboards/${domain._id}/lab_round`);
        const data = await res.json();
        boards[domain._id] = data.leaderboard || data || [];
      }
      setLeaderboards(boards);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-700" />;
    return <span className="font-display text-lg">#{rank}</span>;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <SectionTitle>LAB ROUND LEADERBOARD</SectionTitle>
          
          {competitionStatus?.currentRound === "finals" && (
            <Link
              href="/leaderboard/finals"
              className="font-heading text-lg bg-[#ff1a1a] text-white px-6 py-3 comic-border hover:bg-black transition-colors flex items-center gap-2"
            >
              VIEW FINALS <ArrowRight size={20} />
            </Link>
          )}
        </div>

        {competitionStatus?.currentRound === "finals" && (
          <div className="bg-yellow-100 comic-border p-4 mb-8 text-center">
            <p className="font-heading text-xl text-yellow-900">
              🏆 Finals have started — <Link href="/leaderboard/finals" className="text-[#ff1a1a] underline">View Seminar Hall Results</Link>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="font-display text-3xl animate-pulse">LOADING SCORES...</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {domains.map((domain) => {
              const entries = leaderboards[domain._id] || [];
              return (
                <div key={domain._id} className="bg-white comic-border p-4">
                  <h3 className="font-display text-2xl text-center mb-4 bg-black text-white p-2">
                    {domain.name}
                  </h3>
                  {entries.length === 0 ? (
                    <p className="text-center font-body text-gray-500 py-8">No scores yet</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={entry.teamId}
                          className={`flex items-center justify-between p-3 comic-border ${
                            entry.rank <= 3 ? "bg-yellow-50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {rankIcon(entry.rank)}
                            <span className="font-heading text-lg">{entry.teamName}</span>
                          </div>
                          <span className="font-display text-xl text-[#ff1a1a]">
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
        )}
      </div>
    </Layout>
  );
}
