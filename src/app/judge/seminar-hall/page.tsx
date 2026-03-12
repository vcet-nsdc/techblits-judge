"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ComicCard, SectionTitle, ComicButton } from '@/components/ComicUI';
import { getJudgeId, isSeminarHallJudge } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Users, ChevronRight, Medal } from 'lucide-react';

interface TeamEntry {
  teamId: string;
  teamName: string;
  members: Array<{ name: string; email: string; role: string }>;
  labRoundScore: number;
  finalScore: number | null;
}

interface DomainGroup {
  domainId: string;
  domainName: string;
  teams: TeamEntry[];
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
  judgeCount?: number;
}

const CRITERIA = [
  { id: 'innovation', label: 'Innovation', description: 'Originality and creativity' },
  { id: 'technicalDepth', label: 'Technical Depth', description: 'Architecture, code quality' },
  { id: 'presentation', label: 'Presentation', description: 'Pitch and demo' },
  { id: 'practicalImpact', label: 'Practical Impact', description: 'Solves real problems' },
  { id: 'uiUx', label: 'UI/UX', description: 'Design, usability, polish' },
] as const;

const clampScore = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(10, Math.max(0, value));
};

export default function SeminarHallDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const [domains, setDomains] = React.useState<DomainGroup[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>('');
  const [leaderboards, setLeaderboards] = React.useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [scoringTeam, setScoringTeam] = React.useState<string | null>(null);
  const [scoreForm, setScoreForm] = React.useState<Record<string, number>>({});
  const [feedback, setFeedback] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const fetchLeaderboard = React.useCallback(async (domainId: string) => {
    try {
      const token = localStorage.getItem('judgeToken');
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/judge/seminar-hall/leaderboard?domainId=${encodeURIComponent(domainId)}`, {
        headers,
      });
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboards(prev => ({ ...prev, [domainId]: data.leaderboard || [] }));
    } catch {
      // silent — leaderboard may be empty if scoring hasn't started
    }
  }, []);

  const fetchTeams = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('judgeToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/judge/seminar-hall/teams', { headers });
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data = await res.json();
      setDomains(data.domains || []);
      if (data.domains?.length > 0) {
        setActiveTab(data.domains[0].domainId);
        for (const d of data.domains) {
          fetchLeaderboard(d.domainId);
        }
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'ERROR', description: 'Failed to load Seminar Hall teams', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [fetchLeaderboard, toast]);

  React.useEffect(() => {
    if (!getJudgeId()) {
      router.push('/judge-portal');
      return;
    }
    if (!isSeminarHallJudge()) {
      router.push('/judge/dashboard');
      return;
    }
    fetchTeams();
  }, [router, fetchTeams]);

  const openScoreForm = (teamId: string) => {
    setScoringTeam(teamId);
    const initial: Record<string, number> = {};
    CRITERIA.forEach(({ id }) => { initial[id] = 0; });
    setScoreForm(initial);
    setFeedback('');
  };

  const totalMarks = CRITERIA.reduce((sum, criterion) => sum + (scoreForm[criterion.id] ?? 0), 0);

  const updateCriterionScore = (criterionId: string, value: string) => {
    setScoreForm(prev => ({
      ...prev,
      [criterionId]: clampScore(Number(value))
    }));
  };

  const handleSubmitScore = async () => {
    if (!scoringTeam) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('judgeToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = {
        teamId: scoringTeam,
        marks: totalMarks,
        criteria: CRITERIA.map(({ id, label }) => ({ name: label, marks: scoreForm[id] ?? 0 })),
        feedback: feedback.trim() || undefined
      };

      const res = await fetch('/api/judge/seminar-hall/scores', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit score');
      }

        const result = await res.json();
        toast({ title: 'SCORE SUBMITTED!', description: `Score: ${totalMarks}/50` });
      setScoringTeam(null);

      // Refresh leaderboard for this domain
      const domain = domains.find(d => d.teams.some(t => t.teamId === scoringTeam));
      if (domain) {
        setLeaderboards(prev => ({ ...prev, [domain.domainId]: result.leaderboard || [] }));
      }
    } catch (err: unknown) {
      toast({ title: 'ERROR', description: err instanceof Error ? err.message : 'Failed to submit score', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeDomain = domains.find(d => d.domainId === activeTab);
  const activeLeaderboard = leaderboards[activeTab] || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 md:mb-10">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <Trophy size={28} className="text-[#ff1a1a] md:hidden" />
            <Trophy size={40} className="text-[#ff1a1a] hidden md:block" />
            <SectionTitle>SEMINAR HALL — FINALS</SectionTitle>
          </div>
          <p className="font-body text-base md:text-xl font-bold mt-4 bg-black text-white p-2 inline-block comic-border">
            TOP 5 TEAMS PER DOMAIN COMPETE FOR THE CHAMPIONSHIP
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <span className="font-display text-4xl text-gray-400 animate-pulse">LOADING FINALISTS...</span>
          </div>
        ) : domains.length === 0 ? (
          <ComicCard className="text-center py-12 md:py-16 bg-yellow-50">
            <Trophy size={48} className="mx-auto mb-4 text-gray-300 md:hidden" />
            <Trophy size={60} className="mx-auto mb-4 text-gray-300 hidden md:block" />
            <p className="font-display text-2xl md:text-3xl text-gray-500">FINALS NOT STARTED YET</p>
            <p className="font-body text-sm md:text-lg text-gray-400 mt-2">
              Qualifying teams will appear here once the admin triggers the round transition.
            </p>
          </ComicCard>
        ) : (
          <>
            {/* Domain Tabs */}
            <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 flex-wrap">
              {domains.map(d => (
                <button
                  key={d.domainId}
                  onClick={() => setActiveTab(d.domainId)}
                  className={`font-heading text-base md:text-xl px-3 md:px-6 py-2 md:py-3 comic-border transition-all ${
                    activeTab === d.domainId
                      ? 'bg-[#ff1a1a] text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {d.domainName}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Teams Panel */}
              <div>
                <h2 className="font-display text-2xl md:text-3xl mb-4 flex items-center gap-2">
                  <Users className="text-[#ff1a1a]" /> QUALIFYING TEAMS
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {activeDomain?.teams.map(team => (
                    <ComicCard key={team.teamId} className="bg-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-heading text-lg md:text-2xl truncate">{team.teamName}</h3>
                          <p className="font-body text-sm text-gray-500 mt-1">
                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                          </p>
                          <div className="mt-2 flex gap-4">
                            <span className="font-body text-sm">
                              Lab Score: <strong>{team.labRoundScore}</strong>
                            </span>
                            {team.finalScore !== null && (
                              <span className="font-body text-sm text-[#ff1a1a]">
                                Finals: <strong>{team.finalScore}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <ComicButton
                          size="sm"
                          onClick={() => openScoreForm(team.teamId)}
                          disabled={scoringTeam === team.teamId}
                        >
                          Score <ChevronRight size={16} />
                        </ComicButton>
                      </div>

                      {/* Inline Score Form */}
                      {scoringTeam === team.teamId && (
                        <div className="mt-6 border-t-4 border-black pt-4">
                          <h4 className="font-heading text-lg md:text-xl mb-3 md:mb-4">SCORE THIS TEAM</h4>
                          <div className="space-y-3">
                            {CRITERIA.map(({ id, label, description }) => (
                              <div key={id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-gray-50 p-3">
                                <div className="min-w-0 flex-1">
                                  <label htmlFor={`${team.teamId}-${id}`} className="font-heading text-sm md:text-base block">
                                    {label}
                                  </label>
                                  <p className="font-body text-xs text-gray-500">{description}</p>
                                </div>
                                <input
                                  id={`${team.teamId}-${id}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={10}
                                  step={1}
                                  value={scoreForm[id] ?? 0}
                                  onChange={e => updateCriterionScore(id, e.target.value)}
                                  className="h-14 w-14 shrink-0 rounded-xl border-4 border-black bg-[#ff1a1a] text-center font-display text-3xl text-white outline-none transition-all focus:bg-white focus:text-black focus:ring-4 focus:ring-[#ff1a1a]/20"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center gap-3 md:gap-4">
                            <div className="bg-[#ff1a1a] text-white px-3 md:px-4 py-2 comic-border font-display text-lg md:text-2xl">
                              TOTAL: {totalMarks}/50
                            </div>
                          </div>

                          <textarea
                            className="mt-4 w-full comic-border p-3 font-body text-base resize-none h-20"
                            placeholder="Optional feedback..."
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            maxLength={1000}
                          />

                          <div className="flex gap-3 mt-4">
                            <ComicButton
                              size="sm"
                              onClick={handleSubmitScore}
                              disabled={submitting}
                            >
                              {submitting ? 'Submitting...' : 'Submit Score'}
                            </ComicButton>
                            <ComicButton
                              size="sm"
                              variant="secondary"
                              onClick={() => setScoringTeam(null)}
                              disabled={submitting}
                            >
                              Cancel
                            </ComicButton>
                          </div>
                        </div>
                      )}
                    </ComicCard>
                  ))}
                </div>
              </div>

              {/* Live Finals Leaderboard */}
              <div>
                <h2 className="font-display text-2xl md:text-3xl mb-4 flex items-center gap-2">
                  <Medal className="text-[#ff1a1a]" /> LIVE FINALS LEADERBOARD
                </h2>
                <ComicCard className="bg-black text-white p-2">
                  <div className="bg-gray-900 p-4 md:p-6 comic-border">
                    {activeLeaderboard.length === 0 ? (
                      <p className="font-body text-gray-400 text-center py-8">
                        No finals scores yet. Be the first to score!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {activeLeaderboard.map((entry, i) => (
                          <div
                            key={entry.teamId}
                            className={`flex items-center gap-4 p-3 border-2 ${
                              i === 0
                                ? 'border-yellow-400 bg-yellow-900/30'
                                : i === 1
                                ? 'border-gray-400 bg-gray-800'
                                : i === 2
                                ? 'border-orange-400 bg-orange-900/20'
                                : 'border-gray-700 bg-gray-800'
                            }`}
                          >
                            <span className="font-display text-3xl w-10 text-center">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                            </span>
                            <div className="flex-1">
                              <p className="font-heading text-lg">{entry.teamName}</p>
                              {entry.judgeCount !== undefined && (
                                <p className="font-body text-xs text-gray-400">
                                  Scored by {entry.judgeCount} judge{entry.judgeCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            <span className="font-display text-2xl text-[#ff1a1a]">
                              {entry.totalScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => fetchLeaderboard(activeTab)}
                      className="mt-4 w-full font-heading text-sm text-gray-400 hover:text-white transition-colors border border-gray-700 py-2"
                    >
                      ↻ Refresh Leaderboard
                    </button>
                  </div>
                </ComicCard>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
