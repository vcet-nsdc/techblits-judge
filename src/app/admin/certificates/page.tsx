"use client";

import React, { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";

export default function AdminCertificatesPage() {
  const [templateUrl, setTemplateUrl] = useState("");
  const [nameX, setNameX] = useState(700);
  const [nameY, setNameY] = useState(370);
  const [nameSize, setNameSize] = useState(56);
  const [nameColor, setNameColor] = useState("#0f172a");
  const [teamX, setTeamX] = useState(700);
  const [teamY, setTeamY] = useState(480);
  const [teamSize, setTeamSize] = useState(40);
  const [teamColor, setTeamColor] = useState("#374151");

  const [sampleName, setSampleName] = useState("John Doe");
  const [sampleTeam, setSampleTeam] = useState("Team Alpha");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [token, setToken] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const templateImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("adminToken") || "");
  }, []);

  // Load existing config
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/admin/certificates/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.config) {
          const c = data.config;
          setTemplateUrl(c.templateImagePath);
          setNameX(c.nameX);
          setNameY(c.nameY);
          setNameSize(c.nameSize);
          setNameColor(c.nameColor);
          setTeamX(c.teamX);
          setTeamY(c.teamY);
          setTeamSize(c.teamSize);
          setTeamColor(c.teamColor);
        }
      } catch {
        // Config may not exist yet
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Load template image when URL changes
  useEffect(() => {
    if (!templateUrl) {
      setTemplateLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      templateImgRef.current = img;
      setTemplateLoaded(true);
    };
    img.onerror = () => {
      setTemplateLoaded(false);
      templateImgRef.current = null;
    };
    img.src = templateUrl;
  }, [templateUrl]);

  // Render preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = templateImgRef.current;
    if (!canvas || !img || !templateLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = nameColor;
    ctx.font = `700 ${nameSize}px Georgia`;
    ctx.fillText(sampleName, nameX, nameY);

    ctx.fillStyle = teamColor;
    ctx.font = `600 ${teamSize}px Georgia`;
    ctx.fillText(sampleTeam, teamX, teamY);
  }, [
    templateLoaded, sampleName, sampleTeam,
    nameX, nameY, nameSize, nameColor,
    teamX, teamY, teamSize, teamColor,
  ]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("template", file);

      const res = await fetch("/api/admin/certificates/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Upload failed");
        return;
      }

      // Add cache-bust so the browser reloads the new image
      setTemplateUrl(data.templateImagePath + "?t=" + Date.now());
      setSuccess("Template uploaded!");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const cleanUrl = templateUrl.split("?")[0];
    if (!cleanUrl) {
      setError("Please upload a template first");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/certificates/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateImagePath: cleanUrl,
          nameX, nameY, nameSize, nameColor,
          teamX, teamY, teamSize, teamColor,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess("Configuration saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const CoordInput = ({
    label, value, onChange, min = 0, max = 5000,
  }: {
    label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
  }) => (
    <label className="block space-y-1">
      <span className="font-heading text-sm">{label}</span>
      <input
        type="number"
        min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-10 px-3 bg-white comic-border font-body text-sm focus:outline-none"
      />
    </label>
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="font-body text-lg">Loading configuration...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-5xl font-display mb-2">
          CERTIFICATE CONFIG
        </h1>
        <p className="font-body text-gray-600 mb-8">
          Upload a template image and configure text placement for generated
          certificates.
        </p>

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

        {!token && (
          <div className="comic-border p-4 bg-[#fff7e6] mb-6">
            <p className="font-body font-bold text-yellow-800">
              Admin login required to manage certificate settings.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
          {/* Left: Controls */}
          <section className="lg:col-span-2 space-y-5">
            {/* Upload */}
            <div className="comic-panel p-4 md:p-6 bg-white space-y-3">
              <h2 className="font-heading text-xl border-b-2 border-black pb-1">
                Template Image
              </h2>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleUpload}
                disabled={uploading || !token}
                className="w-full font-body text-sm"
              />
              {uploading && (
                <p className="font-body text-sm text-gray-500">Uploading...</p>
              )}
              {templateUrl && (
                <p className="font-body text-xs text-gray-500 break-all">
                  Current: {templateUrl.split("?")[0]}
                </p>
              )}
            </div>

            {/* Sample Test Names */}
            <div className="comic-panel p-4 md:p-6 bg-white space-y-3">
              <h2 className="font-heading text-xl border-b-2 border-black pb-1">
                Test Preview Names
              </h2>
              <label className="block space-y-1">
                <span className="font-heading text-sm">Participant Name</span>
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  className="w-full h-10 px-3 comic-border font-body text-sm focus:outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-heading text-sm">Team Name</span>
                <input
                  type="text"
                  value={sampleTeam}
                  onChange={(e) => setSampleTeam(e.target.value)}
                  className="w-full h-10 px-3 comic-border font-body text-sm focus:outline-none"
                />
              </label>
            </div>

            {/* Participant Name Position */}
            <div className="comic-panel p-4 md:p-6 bg-white space-y-3">
              <h2 className="font-heading text-xl border-b-2 border-black pb-1">
                Participant Name
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <CoordInput label="X" value={nameX} onChange={setNameX} />
                <CoordInput label="Y" value={nameY} onChange={setNameY} />
                <CoordInput
                  label="Size" value={nameSize} onChange={setNameSize}
                  min={8} max={200}
                />
              </div>
              <label className="block space-y-1">
                <span className="font-heading text-sm">Color</span>
                <input
                  type="color"
                  value={nameColor}
                  onChange={(e) => setNameColor(e.target.value)}
                  className="w-full h-10 cursor-pointer"
                />
              </label>
            </div>

            {/* Team Name Position */}
            <div className="comic-panel p-4 md:p-6 bg-white space-y-3">
              <h2 className="font-heading text-xl border-b-2 border-black pb-1">
                (Team Name)
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <CoordInput label="X" value={teamX} onChange={setTeamX} />
                <CoordInput label="Y" value={teamY} onChange={setTeamY} />
                <CoordInput
                  label="Size" value={teamSize} onChange={setTeamSize}
                  min={8} max={200}
                />
              </div>
              <label className="block space-y-1">
                <span className="font-heading text-sm">Color</span>
                <input
                  type="color"
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-full h-10 cursor-pointer"
                />
              </label>
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !templateUrl || !token}
              className="w-full h-12 font-heading text-xl comic-border comic-shadow-sm bg-[#ff1a1a] text-white disabled:opacity-50 hover:bg-black transition-colors"
            >
              {saving ? "Saving..." : "SAVE CONFIGURATION"}
            </button>
          </section>

          {/* Right: Preview */}
          <section className="lg:col-span-3 comic-panel p-4 md:p-6 bg-white">
            <h2 className="font-heading text-2xl mb-4">Live Preview</h2>

            {!templateUrl && (
              <div className="text-center py-16 comic-border bg-gray-50">
                <p className="font-body text-gray-500 text-lg">
                  Upload a template image to see the preview
                </p>
              </div>
            )}

            {templateUrl && !templateLoaded && (
              <p className="font-body text-sm text-gray-500">
                Loading template...
              </p>
            )}

            <div
              className={`w-full overflow-auto bg-[#f8f8f8] comic-border p-2 ${
                !templateLoaded ? "hidden" : ""
              }`}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto block mx-auto"
              />
            </div>

            {templateLoaded && (
              <p className="font-body text-xs mt-3 text-gray-500">
                Adjust values on the left to reposition text. Changes preview
                instantly.
              </p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
