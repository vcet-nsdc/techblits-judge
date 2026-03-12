"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ComicCard, ComicButton, SectionTitle } from '@/components/ComicUI';
import { getJudgeId } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Crosshair, Users, BrainCircuit, Rocket, Presentation, ArrowLeft } from 'lucide-react';

interface JudgeTeamDetail {
  id: string;
  name: string;
  lab: string;
  domain: string;
  problemStatement: string;
  members: string[];
  hasScored: boolean;
}

const CRITERIA = [
  { id: 'innovation', label: 'INNOVATION', icon: Rocket, desc: 'Originality and creativity' },
  { id: 'techComplexity', label: 'TECH COMPLEXITY', icon: BrainCircuit, desc: 'Architecture, code quality' },
  { id: 'uiUx', label: 'UI / UX', icon: Users, desc: 'Design, usability, polish' },
  { id: 'practicalImpact', label: 'PRACTICAL IMPACT', icon: Crosshair, desc: 'Solves real problems' },
  { id: 'presentation', label: 'PRESENTATION', icon: Presentation, desc: 'Pitch and demo' },
];

export default function EvaluateView({ params }: { params: Promise<{ teamId: string }> }) {
  const router = useRouter();
  const judgeId = getJudgeId();
  const { toast } = useToast();
  const [team, setTeam] = React.useState<JudgeTeamDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [scores, setScores] = React.useState<Record<string, number>>({
    innovation: 0,
    techComplexity: 0,
    uiUx: 0,
    practicalImpact: 0,
    presentation: 0,
  });

  const resolvedParams = React.use(params);
  const teamId = resolvedParams?.teamId || '';

  React.useEffect(() => {
    if (!judgeId || !localStorage.getItem('judgeToken')) {
      router.push('/judge-portal');
    }
  }, [judgeId, router]);

  React.useEffect(() => {
    const fetchTeam = async () => {
      const token = localStorage.getItem('judgeToken');
      if (!token || !teamId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/judge/teams/${teamId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch team');
        }
        setTeam(data.team);
      } catch (error) {
        toast({
          title: 'SYSTEM FAILURE',
          description: error instanceof Error ? error.message : 'Failed to fetch team',
          variant: 'destructive'
        });
        router.push('/judge/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [router, teamId, toast]);

  const totalScore = CRITERIA.reduce((sum, criterion) => sum + (scores[criterion.id] ?? 0), 0);

  const updateScore = (criterionId: string, value: string) => {
    const parsedValue = Number.parseInt(value, 10);
    const nextValue = Number.isNaN(parsedValue) ? 0 : Math.min(10, Math.max(0, parsedValue));
    setScores((currentScores) => ({
      ...currentScores,
      [criterionId]: nextValue,
    }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!team) return;

    const token = localStorage.getItem('judgeToken');
    if (!token) {
      router.push('/judge-portal');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/judge/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamId: team.id,
          marks: totalScore,
          round: 'lab_round',
          criteria: CRITERIA.map((criterion) => ({
            name: criterion.label,
            marks: scores[criterion.id] ?? 0,
          })),
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit score');
      }

      toast({ title: "JUDGMENT CAST", description: "Score successfully recorded." });
      router.push(`/judge/lab/${encodeURIComponent(team.lab)}`);
    } catch (error) {
      toast({
        title: "SYSTEM FAILURE",
        description: error instanceof Error ? error.message : 'Failed to submit score',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !team) return <Layout><div className="text-center py-16 md:py-24 font-display text-3xl md:text-5xl">GATHERING INTEL...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#ff1a1a] hover:text-black transition-colors font-heading text-lg"
          >
            <ArrowLeft size={20} />
            BACK TO TEAM LIST
          </button>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">

          {/* Team Intel Panel */}
          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            <div className="bg-black text-white p-4 comic-border -rotate-1">
              <h2 className="font-heading text-2xl flex items-center gap-2 text-[#ff1a1a]">
                <ShieldAlert /> TARGET ACQUIRED
              </h2>
            </div>

            <ComicCard className="bg-white">
              <span className="font-heading text-xl bg-[#ff1a1a] text-white px-3 py-1 comic-border">
                {team.lab}
              </span>
              <h1 className="font-display text-4xl md:text-6xl mt-4 mb-2">{team.name}</h1>
              <p className="font-heading text-lg md:text-2xl text-gray-500 mb-4 md:mb-6">{team.domain}</p>

              <div className="mb-6">
                <h3 className="font-heading text-xl mb-2 border-b-4 border-black pb-1">MISSION STATEMENT</h3>
                <p className="font-body text-xl italic bg-white p-4 comic-border">
                  {team.problemStatement}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-heading text-xl mb-2 border-b-4 border-black pb-1">SQUAD MEMBERS</h3>
                <ul className="list-disc list-inside font-body text-xl pl-4 space-y-1">
                  {team.members.map((member, index) => <li key={index}>{member}</li>)}
                </ul>
              </div>
            </ComicCard>
          </div>

          {/* Judgment Panel */}
          <div className="lg:col-span-2">
            <SectionTitle className="mb-6 md:mb-8 rotate-1">SCORECARD // MAX 50 PTS</SectionTitle>

            <form onSubmit={onSubmit}>
              {/* Desktop table view */}
              <div className="comic-panel bg-white overflow-hidden hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-black text-white border-b-4 border-black font-heading text-xl">
                      <th className="p-4 text-left drop-shadow-[2px_2px_0_#ff1a1a]">CRITERIA</th>
                      <th className="p-4 text-left drop-shadow-[2px_2px_0_#ff1a1a]">DESCRIPTION</th>
                      <th className="p-4 text-center drop-shadow-[2px_2px_0_#ff1a1a]">SCORE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-black">
                    {CRITERIA.map(c => {
                      const Icon = c.icon;

                      return (
                        <tr key={c.id} className="font-body">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-black text-white p-2 rounded-full">
                                <Icon size={20} />
                              </div>
                              <span className="font-heading text-xl md:text-2xl">{c.label}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-gray-500 text-sm">{c.desc}</span>
                          </td>
                          <td className="p-4 flex justify-center">
                            <input
                              type="number"
                              min="0" max="10"
                              value={scores[c.id] ?? 0}
                              onChange={(e) => updateScore(c.id, e.target.value)}
                              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                                const target = e.target as HTMLInputElement;
                                const val = Number.parseInt(target.value, 10);
                                if (val > 10) target.value = "10";
                                if (val < 0) target.value = "0";
                              }}
                              className="w-20 h-20 text-center font-display text-5xl border-4 border-black rounded-xl bg-[#ff1a1a] text-white comic-shadow focus:bg-white focus:text-black focus:outline-none focus:ring-4 focus:ring-[#ff1a1a]/20 transition-all appearance-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-4">
                {CRITERIA.map(c => {
                  const Icon = c.icon;
                  return (
                    <div key={c.id} className="comic-panel bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-black text-white p-2 rounded-full">
                            <Icon size={18} />
                          </div>
                          <div>
                            <span className="font-heading text-lg block">{c.label}</span>
                            <span className="font-bold text-gray-500 text-xs">{c.desc}</span>
                          </div>
                        </div>
                        <input
                          type="number"
                          min="0" max="10"
                          value={scores[c.id] ?? 0}
                          onChange={(e) => updateScore(c.id, e.target.value)}
                          onInput={(e: React.FormEvent<HTMLInputElement>) => {
                            const target = e.target as HTMLInputElement;
                            const val = Number.parseInt(target.value, 10);
                            if (val > 10) target.value = "10";
                            if (val < 0) target.value = "0";
                          }}
                          className="w-14 h-14 text-center font-display text-3xl border-4 border-black rounded-xl bg-[#ff1a1a] text-white comic-shadow focus:bg-white focus:text-black focus:outline-none focus:ring-4 focus:ring-[#ff1a1a]/20 transition-all appearance-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 md:mt-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 bg-black text-white p-5 md:p-8 comic-border comic-shadow rounded-xl">
                <div>
                  <h3 className="font-heading text-xl md:text-3xl text-gray-400">TOTAL POWER LEVEL</h3>
                  <div className="font-display text-6xl md:text-8xl lg:text-9xl flex items-baseline gap-2">
                    <span className="text-[#ff1a1a] drop-shadow-[4px_4px_0_#fff]">{totalScore}</span>
                    <span className="text-2xl md:text-4xl text-white font-display drop-shadow-[3px_3px_0_#ff1a1a]">/50</span>
                  </div>
                </div>

                <ComicButton type="submit" size="lg" disabled={submitting} className="w-full md:w-auto h-full min-h-20">
                  {submitting ? 'PROCESSING...' : team.hasScored ? 'UPDATE JUDGMENT' : 'CONFIRM JUDGMENT'}
                </ComicButton>
              </div>
            </form>
          </div>

        </div>
      </div>
    </Layout>
  );
}
