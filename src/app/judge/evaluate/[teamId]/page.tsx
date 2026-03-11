"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layout } from '@/components/Layout';
import { ComicCard, ComicButton, SectionTitle } from '@/components/ComicUI';
import { useTeam } from '@/hooks/use-teams';
import { useCreateEvaluation } from '@/hooks/use-evaluations';
import { getJudgeId } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { ShieldAlert, Crosshair, Users, BrainCircuit, Rocket, Presentation, ArrowLeft } from 'lucide-react';
import { insertEvaluationSchema } from '@/db/schema';

const evalSchema = z.object({
  judgeId: z.string(),
  teamId: z.coerce.number(),
  innovation: z.coerce.number().min(0).max(10),
  techComplexity: z.coerce.number().min(0).max(10),
  uiUx: z.coerce.number().min(0).max(10),
  practicalImpact: z.coerce.number().min(0).max(10),
  presentation: z.coerce.number().min(0).max(10),
});

type EvalForm = z.infer<typeof evalSchema>;

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

  const resolvedParams = React.use(params);
  const teamId = Number(resolvedParams?.teamId);

  React.useEffect(() => {
    if (!judgeId) router.push('/judge-portal');
  }, [judgeId, router]);

  const { data: team, isLoading } = useTeam(teamId);
  const { mutate: submitEval, isPending } = useCreateEvaluation();

  const form = useForm<EvalForm>({
    resolver: zodResolver(evalSchema) as any,
    defaultValues: {
      teamId: teamId,
      judgeId: judgeId || '',
      innovation: 0,
      techComplexity: 0,
      uiUx: 0,
      practicalImpact: 0,
      presentation: 0,
    }
  });

  const watchAll = form.watch();
  const totalScore = (
    Number(watchAll.innovation || 0) +
    Number(watchAll.techComplexity || 0) +
    Number(watchAll.uiUx || 0) +
    Number(watchAll.practicalImpact || 0) +
    Number(watchAll.presentation || 0)
  );

  const onSubmit = (data: EvalForm) => {
    submitEval(data, {
      onSuccess: () => {
        toast({ title: "JUDGMENT CAST", description: "Score successfully recorded." });
        router.push(`/judge/lab/${encodeURIComponent(team!.lab)}`);
      },
      onError: (error: Error) => {
        toast({ title: "SYSTEM FAILURE", description: error.message, variant: "destructive" });
      }
    });
  };

  if (isLoading || !team) return <Layout><div className="text-center py-16 md:py-24 font-display text-3xl md:text-5xl">GATHERING INTEL...</div></Layout>;

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
                  {team.members.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            </ComicCard>
          </div>

          {/* Judgment Panel */}
          <div className="lg:col-span-2">
            <SectionTitle className="mb-6 md:mb-8 rotate-1">SCORECARD // MAX 50 PTS</SectionTitle>

            <form onSubmit={form.handleSubmit(onSubmit)}>
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
                              {...form.register(c.id as keyof EvalForm)}
                              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                                const target = e.target as HTMLInputElement;
                                const val = parseInt(target.value);
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
                          {...form.register(c.id as keyof EvalForm)}
                          onInput={(e: React.FormEvent<HTMLInputElement>) => {
                            const target = e.target as HTMLInputElement;
                            const val = parseInt(target.value);
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

                <ComicButton type="submit" size="lg" disabled={isPending} className="w-full md:w-auto h-full min-h-[80px]">
                  {isPending ? 'PROCESSING...' : 'CONFIRM JUDGMENT'}
                </ComicButton>
              </div>
            </form>
          </div>

        </div>
      </div>
    </Layout>
  );
}
