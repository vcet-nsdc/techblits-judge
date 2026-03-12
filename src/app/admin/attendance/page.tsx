"use client";

import React, { useState } from "react";
import { Layout } from "@/components/Layout";

interface TeamMember {
  name: string;
  attended: boolean;
}

export default function AttendancePage() {
  const [teamName, setTeamName] = useState("");
  const [teamDisplayName, setTeamDisplayName] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState("");

  React.useEffect(() => {
    setToken(localStorage.getItem("adminToken") || "");
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setMembers([]);

    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `/api/admin/attendance?team=${encodeURIComponent(teamName.trim())}`,
        { headers }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Team not found");
        return;
      }

      setTeamDisplayName(data.team.name);
      setMembers(data.team.members);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (index: number) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, attended: !m.attended } : m))
    );
  };

  const markAll = (value: boolean) => {
    setMembers((prev) => prev.map((m) => ({ ...m, attended: value })));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const attendance: Record<string, boolean> = {};
      members.forEach((m) => {
        attendance[m.name] = m.attended;
      });

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers,
        body: JSON.stringify({ teamName: teamDisplayName, attendance }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess("Attendance saved successfully!");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-5xl font-display mb-2">
          MARK ATTENDANCE
        </h1>
        <p className="font-body text-gray-600 mb-8">
          Search for a registered team and mark which members are present.
        </p>

        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name..."
            className="flex-1 h-12 px-4 font-body text-lg comic-border focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !teamName.trim()}
            className="h-12 px-6 font-heading text-lg comic-border bg-black text-white disabled:opacity-50 hover:bg-[#ff1a1a] transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="comic-border p-4 bg-[#fff0f0] mb-6">
            <p className="font-body font-bold text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="comic-border p-4 bg-green-50 mb-6">
            <p className="font-body font-bold text-green-700">{success}</p>
          </div>
        )}

        {members.length > 0 && (
          <div className="comic-panel p-4 md:p-6 bg-white space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-heading text-2xl">{teamDisplayName}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => markAll(true)}
                  className="px-3 py-1 font-body text-sm comic-border bg-green-100 hover:bg-green-200 transition-colors"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAll(false)}
                  className="px-3 py-1 font-body text-sm comic-border bg-red-100 hover:bg-red-200 transition-colors"
                >
                  All Absent
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {members.map((member, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 comic-border cursor-pointer transition-colors ${
                    member.attended ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={member.attended}
                    onChange={() => toggleAttendance(i)}
                    className="w-5 h-5 accent-[#ff1a1a]"
                  />
                  <span className="font-body text-lg">{member.name}</span>
                  <span
                    className={`ml-auto font-heading text-sm ${
                      member.attended ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {member.attended ? "PRESENT" : "ABSENT"}
                  </span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 font-heading text-xl comic-border comic-shadow-sm bg-[#ff1a1a] text-white disabled:opacity-50 hover:bg-black transition-colors"
            >
              {saving ? "Saving..." : "SAVE ATTENDANCE"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
