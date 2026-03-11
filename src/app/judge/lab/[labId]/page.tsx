"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ComicCard, ComicButton } from '@/components/ComicUI';
import { useTeams } from '@/hooks/use-teams';
import { useEvaluations } from '@/hooks/use-evaluations';
import { getJudgeId } from '@/hooks/use-auth';
import { CheckCircle2, Play, ArrowLeft } from 'lucide-react';

export default function LabView({ params }: { params: Promise<{ labId: string }> }) {
  const router = useRouter();
  const judgeId = getJudgeId();
  
  // Unwrap params using React.use
  const resolvedParams = React.use(params);
  const labId = decodeURIComponent(resolvedParams?.labId || '');

  React.useEffect(() => {
    if (!judgeId) router.push('/judge-portal');
  }, [judgeId, router]);

  const { data: teams, isLoading: loadingTeams } = useTeams();
  const { data: evaluations, isLoading: loadingEvals } = useEvaluations();

  if (loadingTeams || loadingEvals) {
    return <Layout><div className="text-center py-24 font-display text-5xl animate-pulse">SCANNING SECTOR...</div></Layout>;
  }

  const labTeams = teams?.filter(t => t.lab === labId) || [];

  // Find which teams this specific judge has already evaluated
  const evaluatedTeamIds = new Set(
    evaluations?.filter(e => e.judgeId === judgeId).map(e => e.teamId)
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-4 md:mb-6">
          <Link href="/judge/dashboard">
            <ComicButton variant="secondary" className="flex items-center gap-2">
              <ArrowLeft size={20} />
              BACK TO SECTOR SELECTION
            </ComicButton>
          </Link>
        </div>
        
        <div className="mb-8 md:mb-12 border-b-8 border-black pb-4 md:pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-heading text-lg md:text-2xl text-[#ff1a1a]">CURRENT LOCATION:</span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl uppercase">{labId}</h1>
          </div>
          <div className="font-display text-3xl md:text-5xl bg-black text-white px-4 md:px-6 py-2 comic-border sm:rotate-3">
            {labTeams.length} TEAMS
          </div>
        </div>

        {labTeams.length === 0 ? (
          <ComicCard className="text-center py-12 md:py-16 bg-gray-100">
            <h2 className="font-display text-3xl md:text-5xl text-gray-500">NO TEAMS DETECTED IN THIS SECTOR</h2>
          </ComicCard>
        ) : (
          <div className="grid gap-6 md:gap-8">
            {labTeams.map(team => {
              const isEvaluated = evaluatedTeamIds.has(team.id);

              return (
                <ComicCard key={team.id} className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 ${isEvaluated ? 'bg-white opacity-60' : 'bg-white'}`}>
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-heading text-lg bg-black text-white px-3 py-1 comic-border">
                        {team.domain}
                      </span>
                      {isEvaluated && (
                        <span className="font-heading text-lg bg-black text-white px-3 py-1 comic-border flex items-center gap-1">
                          <CheckCircle2 size={18} /> SCORED
                        </span>
                      )}
                    </div>

                    <h2 className="font-display text-3xl md:text-5xl mb-2">{team.name}</h2>
                    <p className="font-body text-base md:text-xl text-gray-700 line-clamp-2 border-l-4 border-[#ff1a1a] pl-4 italic">
                      &ldquo;{team.problemStatement}&rdquo;
                    </p>
                  </div>

                  <div className="w-full md:w-auto">
                    {!isEvaluated ? (
                      <Link href={`/judge/evaluate/${team.id}`}>
                        <ComicButton
                          variant="primary"
                          className="w-full h-full min-h-[100px]"
                        >
                          <Play className="mr-2" size={32} /> EVALUATE
                        </ComicButton>
                      </Link>
                    ) : (
                      <div className="w-full h-full min-h-[100px] flex items-center justify-center p-6 bg-gray-100 comic-border opacity-50 grayscale">
                        <CheckCircle2 size={48} className="text-green-500" />
                      </div>
                    )}
                  </div>
                </ComicCard>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
