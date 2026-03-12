"use client";
import React, { useEffect, useState } from "react";
import { Play, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

interface CompetitionInfo {
  currentRound: string;
  labRoundStartTime?: string;
  labRoundEndTime?: string;
  finalsStartTime?: string;
  finalsEndTime?: string;
  qualifiedTeamsPerDomain?: number;
  seminarHallId?: string;
}

interface QualifiedTeam {
  teamId: string;
  teamName: string;
  domain?: string;
}

export default function CompetitionControlPage() {
  const [competition, setCompetition] = useState<CompetitionInfo | null>(null);
  const [qualifiedTeams, setQualifiedTeams] = useState<QualifiedTeam[]>([]);
  const [qualifiedPerDomain, setQualifiedPerDomain] = useState(5);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  async function fetchStatus() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statusRes, transitionRes] = await Promise.all([
        fetch("/api/competition/status"),
        fetch("/api/admin/competition/transition", { headers }),
      ]);
      const statusData = await statusRes.json();
      const transitionData = await transitionRes.json();

      setCompetition(statusData);
      setQualifiedTeams(transitionData.qualifiedTeams || []);
      if (statusData.qualifiedTeamsPerDomain) {
        setQualifiedPerDomain(statusData.qualifiedTeamsPerDomain);
      }
    } catch (error) {
      console.error("Error fetching competition status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerTransition() {
    if (!confirm("Are you sure you want to transition to Finals? This will select the top teams and move to Seminar Hall round.")) return;
    
    setTransitioning(true);
    setMessage("");
    
    try {
      const res = await fetch("/api/admin/competition/transition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qualifiedPerDomain }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchStatus();
      } else {
        setMessage(`❌ ${data.error || "Transition failed"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to trigger transition");
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="font-display text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  const isLabRound = competition?.currentRound === "lab_round";
  const isFinals = competition?.currentRound === "finals";

  return (
    <div className="p-6 space-y-8">
      <h1 className="font-display text-4xl">COMPETITION CONTROL</h1>

      {/* Current Status */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-heading text-xl mb-4">Current Status</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded bg-gray-50">
            <p className="text-sm text-gray-500">Current Round</p>
            <p className="font-display text-2xl">
              {competition?.currentRound?.replace("_", " ").toUpperCase() || "N/A"}
            </p>
          </div>
          <div className="p-4 rounded bg-gray-50">
            <p className="text-sm text-gray-500">Lab Round Started</p>
            <p className="font-heading text-lg">
              {competition?.labRoundStartTime
                ? new Date(competition.labRoundStartTime).toLocaleString()
                : "Not started"}
            </p>
          </div>
          {isFinals && (
            <>
              <div className="p-4 rounded bg-gray-50">
                <p className="text-sm text-gray-500">Lab Round Ended</p>
                <p className="font-heading text-lg">
                  {competition?.labRoundEndTime
                    ? new Date(competition.labRoundEndTime).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="p-4 rounded bg-gray-50">
                <p className="text-sm text-gray-500">Finals Started</p>
                <p className="font-heading text-lg">
                  {competition?.finalsStartTime
                    ? new Date(competition.finalsStartTime).toLocaleString()
                    : "—"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transition Control */}
      {isLabRound && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-heading text-xl mb-4 flex items-center gap-2">
            <ArrowRight size={20} /> Trigger Finals Transition
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-heading">Qualified Teams Per Domain:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={qualifiedPerDomain}
                onChange={(e) => setQualifiedPerDomain(Number(e.target.value))}
                className="border rounded px-3 py-2 w-20 text-center"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-heading text-sm text-yellow-800">
                  This will identify the top {qualifiedPerDomain} teams per domain from lab round scores and move them to the Seminar Hall Finals.
                </p>
                <p className="text-xs text-yellow-700 mt-1">This action cannot be easily undone.</p>
              </div>
            </div>
            <button
              onClick={triggerTransition}
              disabled={transitioning}
              className="bg-[#ff1a1a] text-white px-8 py-3 rounded font-heading text-lg hover:bg-[#cc0000] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Play size={20} />
              {transitioning ? "TRANSITIONING..." : "START FINALS"}
            </button>
          </div>
        </div>
      )}

      {isFinals && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <p className="font-heading text-lg text-green-800">Finals are in progress!</p>
            <p className="text-sm text-green-700">{qualifiedTeams.length} teams qualified across all domains.</p>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-gray-50 border rounded p-4">
          <p className="font-heading">{message}</p>
        </div>
      )}

      {/* Qualified Teams */}
      {qualifiedTeams.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-heading text-xl mb-4">Qualified Teams</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {qualifiedTeams.map((team) => (
              <div key={team.teamId} className="border rounded p-3 flex items-center justify-between">
                <span className="font-heading text-sm">{team.teamName}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{team.domain}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
