"use client";

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { SectionTitle, ComicCard } from '@/components/ComicUI';
import { useTeams } from '@/hooks/use-teams';
import { useEvaluations } from '@/hooks/use-evaluations';
import { Flame } from 'lucide-react';

type LabVenue = {
  id: string;
  name: string;
  assignedDomain: string | null;
};

export default function Leaderboard() {
  const { data: teams, isLoading: loadingTeams } = useTeams();
  const { data: evaluations, isLoading: loadingEvals } = useEvaluations();
  const [viewMode, setViewMode] = useState<'global' | 'lab'>('global');
  const [labs, setLabs] = useState<LabVenue[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchLabs = async () => {
      try {
        const response = await fetch('/api/labs?type=lab');
        if (!response.ok) {
          throw new Error('Failed to fetch labs');
        }

        const data = await response.json();
        if (isMounted) {
          setLabs(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setLabs([]);
        }
      }
    };

    fetchLabs();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loadingTeams || loadingEvals) {
    return <Layout><div className="text-center py-16 md:py-24 font-display text-3xl md:text-5xl">CALCULATING STANDINGS...</div></Layout>;
  }

  // Calculate scores
  const teamScores = teams?.map(team => {
    const teamEvals = evaluations?.filter(e => e.teamId === team.id) || [];
    // Average score across all judges who evaluated this team
    const avgScore = teamEvals.length > 0
      ? teamEvals.reduce((sum, e) => sum + e.totalScore, 0) / teamEvals.length
      : 0;

    return {
      ...team,
      avgScore: Number(avgScore.toFixed(1)),
      judgesCount: teamEvals.length
    };
  }) || [];

  // Sort global
  const globalLeaderboard = [...teamScores].sort((a, b) => b.avgScore - a.avgScore);

  // Group by Domain
  const domains = ['Agentic AI', 'Vibecoding', 'UI/UX Challenge'];
  const labsFromApi = labs
    .filter((lab) => typeof lab.name === 'string' && lab.name.trim().length > 0)
    .map((lab) => lab.name)
    .sort((a, b) => a.localeCompare(b));
  const labsFromTeams = Array.from(new Set(globalLeaderboard.map((team) => team.lab))).sort((a, b) => a.localeCompare(b));
  const leaderboardLabs = labsFromApi.length > 0 ? labsFromApi : labsFromTeams;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <SectionTitle className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl">GLOBAL STANDINGS</SectionTitle>
        </div>

        <div className="flex justify-center gap-3 md:gap-4 mb-8 md:mb-12">
          <button
            onClick={() => setViewMode('global')}
            className={`font-heading text-base md:text-2xl px-4 md:px-8 py-2 md:py-3 comic-border transition-all ${viewMode === 'global' ? 'bg-[#ff1a1a] text-white comic-shadow' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            DOMAIN KINGS
          </button>
          <button
            onClick={() => setViewMode('lab')}
            className={`font-heading text-base md:text-2xl px-4 md:px-8 py-2 md:py-3 comic-border transition-all ${viewMode === 'lab' ? 'bg-[#ff1a1a] text-white comic-shadow' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            LAB SECTORS
          </button>
        </div>

        {viewMode === 'global' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {domains.map((domain, i) => {
              const domainTeams = globalLeaderboard.filter(t => t.domain === domain).slice(0, 5); // Top 5 per domain
              const colors = ['bg-black text-white', 'bg-[#ff1a1a] text-white', 'bg-black text-white'];

              return (
                <ComicCard key={domain} className="bg-white p-0 overflow-hidden">
                  <div className={`${colors[i]} border-b-4 border-black p-4 md:p-6 text-center`}>
                    <h2 className="font-display text-2xl md:text-4xl flex items-center justify-center gap-2">
                      <Flame /> {domain}
                    </h2>
                  </div>

                  <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                    {domainTeams.length === 0 ? (
                      <p className="text-center font-heading text-gray-400 py-6 md:py-8">NO CHALLENGERS YET</p>
                    ) : (
                      domainTeams.map((team, rank) => (
                        <div key={team.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 border-4 border-black rounded-xl bg-white hover:bg-gray-50 hover:-translate-y-1 transition-all">
                          <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 flex items-center justify-center font-display text-2xl md:text-3xl border-4 border-black rounded-full comic-shadow ${rank === 0 ? 'bg-[#ff1a1a] text-white' : 'bg-white text-black'}`}>
                            {rank + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading text-lg md:text-2xl truncate">{team.name}</h3>
                            <p className="font-body font-bold text-gray-500 text-xs md:text-sm">Lab: {team.lab} | Evals: {team.judgesCount}</p>
                          </div>
                          <div className="font-display text-2xl md:text-4xl text-[#ff1a1a]">
                            {team.avgScore > 0 ? team.avgScore : '-'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ComicCard>
              );
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
            {leaderboardLabs.map((lab) => {
              const labTeams = globalLeaderboard.filter(t => t.lab === lab);
              const assignedDomain = labs.find((entry) => entry.name === lab)?.assignedDomain;
              return (
                <ComicCard key={lab} className="bg-white">
                  <h2 className="font-display text-3xl md:text-5xl mb-4 md:mb-6 border-b-4 border-black pb-2">{lab} LEADERBOARD</h2>
                  {assignedDomain ? (
                    <p className="font-heading text-xs md:text-sm text-gray-600 mb-4 md:mb-5">DOMAIN: {assignedDomain.toUpperCase()}</p>
                  ) : null}

                  <div className="space-y-4">
                    {labTeams.length === 0 ? (
                      <p className="text-center font-heading text-gray-400 py-4">NO CHALLENGERS YET</p>
                    ) : (
                      labTeams.map((team, rank) => (
                        <div key={team.id} className="flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-3 md:pb-4 last:border-0">
                          <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <span className={`font-display text-2xl md:text-3xl shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border-2 border-black rounded ${rank === 0 ? 'bg-[#ff1a1a] text-white comic-shadow-sm' :
                                rank < 5 ? 'bg-black text-white' :
                                  'text-gray-400 border-none'
                              }`}>
                              {rank + 1}
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-heading text-lg md:text-2xl truncate">{team.name}</h3>
                              <span className="font-body font-bold text-xs md:text-sm px-2 py-0.5 md:py-1 bg-black text-white border-2 border-black rounded">{team.domain}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="font-display text-2xl md:text-4xl">{team.avgScore > 0 ? team.avgScore : 'PENDING'}</div>
                            <div className="font-body text-xs md:text-sm text-gray-500 font-bold">{team.judgesCount} JUDGES</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ComicCard>
              );
            })}

            {leaderboardLabs.length === 0 ? (
              <ComicCard className="bg-white sm:col-span-2">
                <p className="text-center font-heading text-gray-500 py-8">NO LABS AVAILABLE YET</p>
              </ComicCard>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
}
