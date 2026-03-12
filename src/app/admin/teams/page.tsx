"use client";
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";

interface DomainInfo {
  _id: string;
  name: string;
}

interface LabInfo {
  _id: string;
  name: string;
}

interface TeamMember {
  name: string;
  email: string;
  role: "leader" | "member";
}

interface TeamInfo {
  _id: string;
  name: string;
  domainId: DomainInfo | string;
  labId: LabInfo | string;
  members: TeamMember[];
  currentScore: number;
  qualifiedForFinals: boolean;
  isActive: boolean;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [labs, setLabs] = useState<LabInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ domain: "", lab: "" });
  const [token, setToken] = useState("");
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    domainId: string;
    labId: string;
    members: TeamMember[];
  }>({
    name: "",
    domainId: "",
    labId: "",
    members: [{ name: "", email: "", role: "leader" }],
  });

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  async function fetchAll() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [teamsRes, domainsRes, labsRes] = await Promise.all([
        fetch("/api/admin/teams", { headers }),
        fetch("/api/domains"),
        fetch("/api/labs"),
      ]);
      
      const teamsData = await teamsRes.json();
      const domainsData = await domainsRes.json();
      const labsData = await labsRes.json();
      
      setTeams(teamsData.teams || []);
      setDomains(domainsData.domains || domainsData || []);
      setLabs(labsData.labs || labsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setFormData({ name: "", domainId: "", labId: "", members: [{ name: "", email: "", role: "leader" }] });
        fetchAll();
      }
    } catch (error) {
      console.error("Error creating team:", error);
    }
  }

  async function updateTeam(teamId: string, data: Record<string, unknown>) {
    try {
      await fetch(`/api/admin/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      setEditingId(null);
      fetchAll();
    } catch (error) {
      console.error("Error updating team:", error);
    }
  }

  function addMember() {
    setFormData({
      ...formData,
      members: [...formData.members, { name: "", email: "", role: "member" }],
    });
  }

  function updateMember(index: number, field: keyof TeamMember, value: string) {
    const updated = [...formData.members];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, members: updated });
  }

  function removeMember(index: number) {
    if (formData.members.length <= 1) return;
    setFormData({ ...formData, members: formData.members.filter((_, i) => i !== index) });
  }

  const filteredTeams = teams.filter((t) => {
    if (filter.domain) {
      const dId = typeof t.domainId === "object" ? t.domainId._id : t.domainId;
      if (dId !== filter.domain) return false;
    }
    if (filter.lab) {
      const lId = typeof t.labId === "object" ? t.labId._id : t.labId;
      if (lId !== filter.lab) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="p-8 font-display text-2xl animate-pulse">LOADING TEAMS...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">MANAGE TEAMS</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#ff1a1a] text-white px-4 py-2 rounded font-heading flex items-center gap-2 hover:bg-[#cc0000]"
        >
          <Plus size={18} /> Add Team
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter.domain}
          onChange={(e) => setFilter({ ...filter, domain: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="">All Domains</option>
          {domains.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <select
          value={filter.lab}
          onChange={(e) => setFilter({ ...filter, lab: e.target.value })}
          className="border rounded px-3 py-2"
        >
          <option value="">All Labs</option>
          {labs.map((l) => (
            <option key={l._id} value={l._id}>{l.name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">{filteredTeams.length} teams</span>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="font-heading text-xl">Create New Team</h3>
          <input
            placeholder="Team Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <select value={formData.domainId} onChange={(e) => setFormData({ ...formData, domainId: e.target.value })} className="border rounded px-3 py-2">
              <option value="">Select Domain</option>
              {domains.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <select value={formData.labId} onChange={(e) => setFormData({ ...formData, labId: e.target.value })} className="border rounded px-3 py-2">
              <option value="">Select Lab</option>
              {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <p className="font-heading text-sm">Members:</p>
            {formData.members.map((member, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="Name" value={member.name} onChange={(e) => updateMember(i, "name", e.target.value)} className="border rounded px-2 py-1 flex-1" />
                <input placeholder="Email" value={member.email} onChange={(e) => updateMember(i, "email", e.target.value)} className="border rounded px-2 py-1 flex-1" />
                <select value={member.role} onChange={(e) => updateMember(i, "role", e.target.value)} className="border rounded px-2 py-1">
                  <option value="leader">Leader</option>
                  <option value="member">Member</option>
                </select>
                <button onClick={() => removeMember(i)} className="text-red-500 p-1"><X size={16} /></button>
              </div>
            ))}
            <button onClick={addMember} className="text-sm text-blue-600 hover:underline">+ Add Member</button>
          </div>
          <div className="flex gap-2">
            <button onClick={createTeam} className="bg-green-600 text-white px-4 py-2 rounded font-heading hover:bg-green-700 flex items-center gap-1">
              <Check size={16} /> Create
            </button>
            <button onClick={() => setShowCreateForm(false)} className="bg-gray-200 px-4 py-2 rounded font-heading">Cancel</button>
          </div>
        </div>
      )}

      {/* Teams Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-heading">Team</th>
              <th className="text-left p-3 font-heading">Domain</th>
              <th className="text-left p-3 font-heading">Lab</th>
              <th className="text-center p-3 font-heading">Members</th>
              <th className="text-center p-3 font-heading">Score</th>
              <th className="text-center p-3 font-heading">Qualified</th>
              <th className="text-center p-3 font-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <tr key={team._id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-semibold">{team.name}</td>
                <td className="p-3">{typeof team.domainId === "object" ? team.domainId.name : "—"}</td>
                <td className="p-3">{typeof team.labId === "object" ? team.labId.name : "—"}</td>
                <td className="p-3 text-center">{team.members?.length || 0}</td>
                <td className="p-3 text-center font-bold text-[#ff1a1a]">{team.currentScore}</td>
                <td className="p-3 text-center">
                  {team.qualifiedForFinals ? "✅" : "—"}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => updateTeam(team._id, { isActive: !team.isActive })}
                    className="text-gray-500 hover:text-red-500 p-1"
                    title={team.isActive ? "Deactivate" : "Activate"}
                  >
                    {team.isActive ? <Trash2 size={16} /> : <Check size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
