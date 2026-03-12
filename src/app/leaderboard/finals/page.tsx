"use client";
import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SectionTitle } from "@/components/ComicUI";
import { Trophy, Medal, Award, ArrowLeft } from "lucide-react";
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
}

export default function FinalsLeaderboardPage() {
  const [leaderboards, setLeaderboards] = useState<Record<string, { domainName: string; entries: LeaderboardEntry[] }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/leaderboards/finals/all");
      const data = await res.json();
      setLeaderboards(data.leaderboards || {});
    } catch (error) {
      console.error("Error fetching finals leaderboard:", error);
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
          <SectionTitle>FINALS LEADERBOARD</SectionTitle>
          <Link
            href="/leaderboard"
            className="font-heading text-lg bg-black text-white px-6 py-3 comic-border hover:bg-[#ff1a1a] transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} /> LAB ROUND
          </Link>
        </div>

        <div className="bg-[#ff1a1a] text-white comic-border p-4 mb-8 text-center">
          <p className="font-heading text-xl">🏟️ SEMINAR HALL FINALS — TOP 5 PER DOMAIN</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="font-display text-3xl animate-pulse">LOADING FINALS...</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(leaderboards).map(([domainId, { domainName, entries }]) => (
              <div key={domainId} className="bg-white comic-border p-4">
                <h3 className="font-display text-2xl text-center mb-4 bg-[#ff1a1a] text-white p-2">
                  {domainName}
                </h3>
                {entries.length === 0 ? (
                  <p className="text-center font-body text-gray-500 py-8">No finals scores yet</p>
                ) : (
                  <div className="space-y-2">
                    {entries.slice(0, 5).map((entry) => (
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
                        <div className="text-right">
                          <span className="font-display text-xl text-[#ff1a1a]">
                            {entry.totalScore}
                          </span>
                          {entry.judgeCount && (
                            <div className="text-xs font-body text-gray-500">
                              {entry.judgeCount} judge{entry.judgeCount > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
