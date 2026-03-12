"use client";
import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SectionTitle } from "@/components/ComicUI";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
  domainName?: string;
}

interface DomainInfo {
  _id: string;
  name: string;
}

export default function StandingsPage() {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const domainsRes = await fetch("/api/domains");
      const domainsData = await domainsRes.json();
      const domainList: DomainInfo[] = domainsData.domains || domainsData || [];
      setDomains(domainList);

      const combined: LeaderboardEntry[] = [];
      for (const domain of domainList) {
        const res = await fetch(`/api/leaderboards/${domain._id}/lab_round`);
        const data = await res.json();
        const entries = (data.leaderboard || data || []) as LeaderboardEntry[];
        for (const entry of entries) {
          combined.push({ ...entry, domainName: domain.name });
        }
      }

      combined.sort((a, b) => b.totalScore - a.totalScore);
      combined.forEach((entry, i) => {
        entry.rank = i + 1;
      });

      setAllEntries(combined);
    } catch (error) {
      console.error("Error fetching standings:", error);
    } finally {
      setLoading(false);
    }
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-700" />;
    return <span className="font-display text-lg w-6 text-center">#{rank}</span>;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <SectionTitle>OVERALL STANDINGS</SectionTitle>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="font-display text-3xl animate-pulse">CALCULATING RANKS...</div>
          </div>
        ) : allEntries.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-heading text-2xl text-gray-500">No scores submitted yet</p>
          </div>
        ) : (
          <div className="bg-white comic-border overflow-hidden">
            <div className="bg-black text-white p-4 grid grid-cols-12 gap-4 font-heading text-lg">
              <div className="col-span-1 text-center">RANK</div>
              <div className="col-span-5">TEAM</div>
              <div className="col-span-3">DOMAIN</div>
              <div className="col-span-3 text-right">SCORE</div>
            </div>
            {allEntries.map((entry) => (
              <div
                key={entry.teamId}
                className={`p-4 grid grid-cols-12 gap-4 items-center border-b-2 border-black last:border-0 ${
                  entry.rank <= 3 ? "bg-yellow-50" : "bg-white"
                }`}
              >
                <div className="col-span-1 flex justify-center">{rankIcon(entry.rank)}</div>
                <div className="col-span-5 font-heading text-lg">{entry.teamName}</div>
                <div className="col-span-3">
                  <span className="font-body text-sm bg-gray-100 px-2 py-1 comic-border inline-block">
                    {entry.domainName}
                  </span>
                </div>
                <div className="col-span-3 text-right font-display text-2xl text-[#ff1a1a]">
                  {entry.totalScore}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
