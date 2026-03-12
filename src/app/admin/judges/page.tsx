"use client";
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Check, X, Shield, Eye, EyeOff } from "lucide-react";

interface DomainInfo {
  _id: string;
  name: string;
}

interface LabInfo {
  _id: string;
  name: string;
}

interface JudgeInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedLabId: LabInfo | string;
  assignedDomains: (DomainInfo | string)[];
  isActive: boolean;
  lastLoginAt?: string;
}

export default function AdminJudgesPage() {
  const [judges, setJudges] = useState<JudgeInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [labs, setLabs] = useState<LabInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [token, setToken] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    assignedLabId: "",
    assignedDomains: [] as string[],
    role: "lab_round",
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
      const [judgesRes, domainsRes, labsRes] = await Promise.all([
        fetch("/api/admin/judges", { headers }),
        fetch("/api/domains"),
        fetch("/api/labs"),
      ]);
      
      const judgesData = await judgesRes.json();
      const domainsData = await domainsRes.json();
      const labsData = await labsRes.json();
      
      setJudges(judgesData.judges || []);
      setDomains(domainsData.domains || domainsData || []);
      setLabs(labsData.labs || labsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createJudge() {
    try {
      const res = await fetch("/api/admin/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setFormData({ name: "", email: "", password: "", assignedLabId: "", assignedDomains: [], role: "lab_round" });
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create judge");
      }
    } catch (error) {
      console.error("Error creating judge:", error);
    }
  }

  async function toggleActive(judgeId: string, isActive: boolean) {
    try {
      await fetch(`/api/admin/judges/${judgeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchAll();
    } catch (error) {
      console.error("Error toggling judge:", error);
    }
  }

  function toggleDomain(domainId: string) {
    setFormData((prev) => ({
      ...prev,
      assignedDomains: prev.assignedDomains.includes(domainId)
        ? prev.assignedDomains.filter((d) => d !== domainId)
        : [...prev.assignedDomains, domainId],
    }));
  }

  const roleColors: Record<string, string> = {
    lab_round: "bg-blue-100 text-blue-800",
    seminar_hall: "bg-purple-100 text-purple-800",
    admin: "bg-red-100 text-red-800",
  };

  if (loading) {
    return <div className="p-8 font-display text-2xl animate-pulse">LOADING JUDGES...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">MANAGE JUDGES</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#ff1a1a] text-white px-4 py-2 rounded font-heading flex items-center gap-2 hover:bg-[#cc0000]"
        >
          <Plus size={18} /> Add Judge
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="font-heading text-xl">Create New Judge</h3>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border rounded px-3 py-2" />
            <input placeholder="Email / Username" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border rounded px-3 py-2" />
            <input placeholder="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="border rounded px-3 py-2" />
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="border rounded px-3 py-2">
              <option value="lab_round">Lab Round Judge</option>
              <option value="seminar_hall">Seminar Hall Judge</option>
              <option value="admin">Admin</option>
            </select>
            <select value={formData.assignedLabId} onChange={(e) => setFormData({ ...formData, assignedLabId: e.target.value })} className="border rounded px-3 py-2">
              <option value="">Select Lab</option>
              {labs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <p className="font-heading text-sm mb-2">Assigned Domains:</p>
            <div className="flex gap-2 flex-wrap">
              {domains.map((d) => (
                <button
                  key={d._id}
                  onClick={() => toggleDomain(d._id)}
                  className={`px-3 py-1 rounded border text-sm ${
                    formData.assignedDomains.includes(d._id)
                      ? "bg-[#ff1a1a] text-white border-[#ff1a1a]"
                      : "bg-white text-gray-600 border-gray-300"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createJudge} className="bg-green-600 text-white px-4 py-2 rounded font-heading hover:bg-green-700 flex items-center gap-1">
              <Check size={16} /> Create
            </button>
            <button onClick={() => setShowCreateForm(false)} className="bg-gray-200 px-4 py-2 rounded font-heading">Cancel</button>
          </div>
        </div>
      )}

      {/* Judges Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-heading">Name</th>
              <th className="text-left p-3 font-heading">Email</th>
              <th className="text-left p-3 font-heading">Role</th>
              <th className="text-left p-3 font-heading">Lab</th>
              <th className="text-left p-3 font-heading">Domains</th>
              <th className="text-center p-3 font-heading">Status</th>
              <th className="text-center p-3 font-heading">Last Login</th>
              <th className="text-center p-3 font-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {judges.map((judge) => (
              <tr key={judge._id} className={`border-t hover:bg-gray-50 ${!judge.isActive ? "opacity-50" : ""}`}>
                <td className="p-3 font-semibold">{judge.name}</td>
                <td className="p-3">{judge.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-heading ${roleColors[judge.role] || "bg-gray-100"}`}>
                    {judge.role.replace("_", " ").toUpperCase()}
                  </span>
                </td>
                <td className="p-3">{typeof judge.assignedLabId === "object" ? judge.assignedLabId.name : "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {judge.assignedDomains?.map((d, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {typeof d === "object" ? d.name : d}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-center">{judge.isActive ? "✅" : "❌"}</td>
                <td className="p-3 text-center text-xs">
                  {judge.lastLoginAt ? new Date(judge.lastLoginAt).toLocaleString() : "Never"}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggleActive(judge._id, judge.isActive)}
                    className="text-gray-500 hover:text-red-500 p-1"
                    title={judge.isActive ? "Deactivate" : "Activate"}
                  >
                    {judge.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
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
