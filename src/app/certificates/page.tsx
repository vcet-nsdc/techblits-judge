"use client";

import { useRef, useState } from "react";
import { Layout } from "@/components/Layout";

interface CertificateData {
  memberName: string;
  teamName: string;
  imageDataUrl: string;
}

interface CertConfig {
  templateUrl: string;
  nameX: number;
  nameY: number;
  nameSize: number;
  nameColor: string;
  teamX: number;
  teamY: number;
  teamSize: number;
  teamColor: string;
}

export default function CertificatesPage() {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const templateImgRef = useRef<HTMLImageElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    setError(null);
    setCertificates([]);

    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: teamName.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong");
        return;
      }

      const config: CertConfig = data.config;
      const members: { name: string }[] = data.members;
      const actualTeamName: string = data.teamName;

      // Load template image
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(new Error("Failed to load certificate template"));
        image.src = config.templateUrl;
      });
      templateImgRef.current = img;

      // Render each member's certificate on canvas
      const certs: CertificateData[] = members.map((member) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;

        ctx.drawImage(img, 0, 0);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Participant name
        ctx.fillStyle = config.nameColor;
        ctx.font = `700 ${config.nameSize}px Georgia`;
        ctx.fillText(member.name, config.nameX, config.nameY);

        // Team name
        ctx.fillStyle = config.teamColor;
        ctx.font = `600 ${config.teamSize}px Georgia`;
        ctx.fillText(actualTeamName, config.teamX, config.teamY);

        return {
          memberName: member.name,
          teamName: actualTeamName,
          imageDataUrl: canvas.toDataURL("image/png"),
        };
      });

      setCertificates(certs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const downloadCertificate = (cert: CertificateData) => {
    const link = document.createElement("a");
    link.href = cert.imageDataUrl;
    link.download = `${slugify(cert.teamName)}-${slugify(cert.memberName)}-certificate.png`;
    link.click();
  };

  const downloadAll = () => certificates.forEach(downloadCertificate);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-display text-[#ff1a1a] mb-3">
            GET YOUR CERTIFICATE
          </h1>
          <p className="font-body text-lg text-gray-600">
            Enter your team name to generate certificates for all attended
            members.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name..."
              className="flex-1 h-14 px-5 text-lg font-body comic-border focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="h-14 px-8 font-heading text-xl comic-border comic-shadow-sm bg-[#ff1a1a] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors"
            >
              {loading ? "Loading..." : "GET CERTIFICATES"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto mb-8 comic-border p-4 bg-[#fff0f0] text-center">
            <p className="font-body font-bold text-red-700">{error}</p>
          </div>
        )}

        {/* Certificates */}
        {certificates.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-heading text-2xl">
                {certificates.length} Certificate
                {certificates.length > 1 ? "s" : ""} Generated
              </h2>
              {certificates.length > 1 && (
                <button
                  type="button"
                  onClick={downloadAll}
                  className="px-6 py-2 font-heading text-base comic-border comic-shadow-sm bg-black text-white hover:bg-[#ff1a1a] transition-colors"
                >
                  Download All
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert, i) => (
                <div key={i} className="comic-panel p-3 bg-white space-y-3">
                  <img
                    src={cert.imageDataUrl}
                    alt={`Certificate for ${cert.memberName}`}
                    className="w-full comic-border"
                  />
                  <div className="text-center">
                    <p className="font-heading text-lg">{cert.memberName}</p>
                    <p className="font-body text-sm text-gray-500">
                      ({cert.teamName})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadCertificate(cert)}
                    className="w-full py-2 font-heading text-sm comic-border bg-[#ff1a1a] text-white hover:bg-black transition-colors"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}