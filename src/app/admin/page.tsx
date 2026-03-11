"use client";

import React from 'react';
import { Layout } from '@/components/Layout';
import { ComicCard, SectionTitle, ComicButton } from '@/components/ComicUI';
import { useCacheClear } from '@/hooks/use-cache-clear';
import { RefreshCw, Trash2, AlertTriangle, Trophy, Zap } from 'lucide-react';

export default function AdminPage() {
  const { clearAllCache, clearPattern, isLoading, error } = useCacheClear();
  const [pattern, setPattern] = React.useState('');
  const [result, setResult] = React.useState<string | null>(null);

  // Finals transition state
  const [transitionStatus, setTransitionStatus] = React.useState<{
    currentRound?: string;
    qualifiedTeams?: Array<{ teamId: string; teamName: string; domain: string }>;
  } | null>(null);
  const [transitionLoading, setTransitionLoading] = React.useState(false);
  const [transitionResult, setTransitionResult] = React.useState<string | null>(null);
  const [transitionError, setTransitionError] = React.useState<string | null>(null);
  const [qualifiedPerDomain, setQualifiedPerDomain] = React.useState(5);

  React.useEffect(() => {
    fetchTransitionStatus();
  }, []);

  const fetchTransitionStatus = async () => {
    try {
      const res = await fetch('/api/admin/competition/transition');
      if (res.ok) {
        setTransitionStatus(await res.json());
      }
    } catch {
      // Competition may not be set up yet
    }
  };

  const handleTriggerFinals = async () => {
    if (!window.confirm(`Trigger finals with top ${qualifiedPerDomain} teams per domain? This cannot be undone.`)) return;
    setTransitionLoading(true);
    setTransitionResult(null);
    setTransitionError(null);
    try {
      const res = await fetch('/api/admin/competition/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualifiedPerDomain })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transition failed');
      setTransitionResult(`✅ Finals started! ${data.totalQualified} teams qualified.`);
      fetchTransitionStatus();
    } catch (err: unknown) {
      setTransitionError(err instanceof Error ? err.message : 'Transition failed');
    } finally {
      setTransitionLoading(false);
    }
  };

  const handleClearAll = async () => {
    const clearResult = await clearAllCache();
    if (clearResult) {
      setResult(`Cleared: ${clearResult.clearedItems.join(', ')}`);
    }
  };

  const handleClearPattern = async () => {
    if (!pattern.trim()) return;
    
    const clearResult = await clearPattern(pattern);
    if (clearResult) {
      setResult(`Cleared pattern "${pattern}": ${clearResult.clearedItems.join(', ')}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <SectionTitle>SYSTEM ADMINISTRATION</SectionTitle>
        
        <div className="mt-8 space-y-6 md:space-y-8">
          {/* Cache Management */}
          <ComicCard className="bg-[#ff1a1a] p-2">
            <div className="bg-white p-4 md:p-8 comic-border">
              <h2 className="font-display text-2xl md:text-4xl mb-4 md:mb-6 flex items-center gap-3">
                <RefreshCw className="text-[#ff1a1a]" />
                CACHE MANAGEMENT
              </h2>
              
              <div className="space-y-6">
                {/* Clear All Cache */}
                <div className="border-4 border-black p-4 md:p-6 bg-yellow-50">
                  <h3 className="font-heading text-xl md:text-2xl mb-4 flex items-center gap-2">
                    <Trash2 />
                    Clear All Caches
                  </h3>
                  <p className="font-body text-sm md:text-base mb-4">
                    This will clear all server-side caches and force browser cache invalidation.
                    Use this when you notice stale data or caching issues.
                  </p>
                  <ComicButton 
                    onClick={handleClearAll}
                    disabled={isLoading}
                    className="w-full"
                    variant="secondary"
                  >
                    {isLoading ? 'Clearing...' : 'Clear All Caches'}
                  </ComicButton>
                </div>

                {/* Clear Pattern */}
                <div className="border-4 border-black p-4 md:p-6 bg-blue-50">
                  <h3 className="font-heading text-xl md:text-2xl mb-4">Clear Specific Pattern</h3>
                  <p className="font-body text-sm md:text-base mb-4">
                    Clear cache entries matching a specific pattern (e.g., &quot;teams:*&quot;, &quot;leaderboard:*&quot;).
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    <input
                      type="text"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      placeholder="Enter pattern (e.g., teams:*)"
                      className="flex-1 px-4 py-2 border-4 border-black font-body"
                      disabled={isLoading}
                    />
                    <ComicButton 
                      onClick={handleClearPattern}
                      disabled={isLoading || !pattern.trim()}
                      variant="secondary"
                    >
                      Clear Pattern
                    </ComicButton>
                  </div>
                </div>

                {/* Results */}
                {result && (
                  <div className="border-4 border-green-500 p-4 bg-green-50">
                    <h4 className="font-heading text-xl mb-2 text-green-800">✅ Success!</h4>
                    <p className="font-body text-green-700">{result}</p>
                  </div>
                )}

                {/* Errors */}
                {error && (
                  <div className="border-4 border-red-500 p-4 bg-red-50">
                    <h4 className="font-heading text-xl mb-2 flex items-center gap-2 text-red-800">
                      <AlertTriangle />
                      Error
                    </h4>
                    <p className="font-body text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </ComicCard>

          {/* Quick Actions */}
          <ComicCard className="bg-black text-white p-2">
            <div className="bg-gray-900 p-4 md:p-8 comic-border">
              <h2 className="font-display text-2xl md:text-4xl mb-4 md:mb-6">QUICK ACTIONS</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="border-4 border-white p-3 md:p-4">
                  <h3 className="font-heading text-lg md:text-xl mb-2">Clear Teams Cache</h3>
                  <p className="font-body mb-4 text-gray-300 text-sm">
                    Clear all team-related cache entries
                  </p>
                  <ComicButton 
                    onClick={() => clearPattern('teams:*')}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    Clear Teams
                  </ComicButton>
                </div>

                <div className="border-4 border-white p-3 md:p-4">
                  <h3 className="font-heading text-lg md:text-xl mb-2">Clear Leaderboards</h3>
                  <p className="font-body mb-4 text-gray-300 text-sm">
                    Clear all leaderboard cache entries
                  </p>
                  <ComicButton 
                    onClick={() => clearPattern('leaderboard:*')}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    Clear Leaderboards
                  </ComicButton>
                </div>

                <div className="border-4 border-white p-3 md:p-4">
                  <h3 className="font-heading text-lg md:text-xl mb-2">Clear Sessions</h3>
                  <p className="font-body mb-4 text-gray-300 text-sm">
                    Clear all user session cache entries
                  </p>
                  <ComicButton 
                    onClick={() => clearPattern('session:*')}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    Clear Sessions
                  </ComicButton>
                </div>

                <div className="border-4 border-white p-3 md:p-4">
                  <h3 className="font-heading text-lg md:text-xl mb-2">Clear Evaluations</h3>
                  <p className="font-body mb-4 text-gray-300 text-sm">
                    Clear all evaluation cache entries
                  </p>
                  <ComicButton 
                    onClick={() => clearPattern('evaluations:*')}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    Clear Evaluations
                  </ComicButton>
                </div>
              </div>
            </div>
          </ComicCard>

          {/* Finals Transition */}
          <ComicCard className="bg-[#ff1a1a] p-2">
            <div className="bg-white p-4 md:p-8 comic-border">
              <h2 className="font-display text-2xl md:text-4xl mb-2 flex items-center gap-3">
                <Trophy className="text-[#ff1a1a]" />
                FINALS TRANSITION
              </h2>
              <p className="font-body text-gray-600 text-sm md:text-base mb-4 md:mb-6">
                Move the top teams per domain to the Seminar Hall for the finals round.
                This will mark qualifying teams and change the competition round to &quot;finals&quot;.
              </p>

              {/* Current Round Status */}
              {transitionStatus && (
                <div className={`border-4 p-4 mb-6 ${transitionStatus.currentRound === 'finals' ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
                  <p className="font-heading text-xl">
                    Current Round: <span className="uppercase">{transitionStatus.currentRound ?? 'lab_round'}</span>
                  </p>
                  {transitionStatus.qualifiedTeams && transitionStatus.qualifiedTeams.length > 0 && (
                    <div className="mt-3">
                      <p className="font-heading text-base mb-2">
                        {transitionStatus.qualifiedTeams.length} teams qualified for finals:
                      </p>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {transitionStatus.qualifiedTeams.map(t => (
                          <div key={t.teamId} className="font-body text-sm bg-white border-2 border-black px-2 py-1">
                            <strong>{t.teamName}</strong>
                            <span className="text-gray-500 ml-1">({t.domain})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {transitionStatus?.currentRound === 'finals' ? (
                <div className="border-4 border-green-500 p-4 bg-green-50">
                  <p className="font-heading text-xl text-green-800 flex items-center gap-2">
                    <Trophy /> Finals are already in progress!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                    <label className="font-heading text-lg md:text-xl">Teams per Domain:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={qualifiedPerDomain}
                      onChange={e => setQualifiedPerDomain(Number(e.target.value))}
                      className="w-20 comic-border px-3 py-2 font-display text-xl text-center"
                    />
                  </div>

                  <ComicButton
                    onClick={handleTriggerFinals}
                    disabled={transitionLoading}
                    className="w-full"
                  >
                    <Zap size={20} className="mr-2" />
                    {transitionLoading ? 'TRANSITIONING...' : `TRIGGER FINALS — TOP ${qualifiedPerDomain} PER DOMAIN`}
                  </ComicButton>

                  {transitionResult && (
                    <div className="border-4 border-green-500 p-4 bg-green-50">
                      <p className="font-heading text-lg text-green-800">{transitionResult}</p>
                    </div>
                  )}

                  {transitionError && (
                    <div className="border-4 border-red-500 p-4 bg-red-50">
                      <p className="font-heading text-lg text-red-800 flex items-center gap-2">
                        <AlertTriangle size={18} /> {transitionError}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={fetchTransitionStatus}
                className="mt-4 text-sm font-body text-gray-500 hover:text-black underline"
              >
                ↻ Refresh Status
              </button>
            </div>
          </ComicCard>
        </div>
      </div>
    </Layout>
  );
}
