"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Search,
  MapPin,
  Sliders,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [limitCount, setLimitCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nichePresets = [
    "Restoran",
    "Cafe",
    "Klinik Kecantikan",
    "Salon",
    "Barbershop",
    "Hotel",
    "Toko Baju",
    "Kursus Inggris",
    "Klinik Gigi",
    "Kontraktor Jasa",
  ];

  const cityPresets = ["Jakarta", "Bandung", "Malang", "Surabaya", "Bali", "Medan", "Semarang"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !niche.trim()) {
      setError("Harap isi nama kota dan jenis kategori bisnis.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          niche: niche.trim(),
          limitCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal memulai pencarian.");
      } else {
        // Redirect to the campaign details page to poll in real-time!
        router.push(`/campaigns/${data.session.id}`);
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10 min-h-screen">
      {/* Back Button and Header */}
      <div className="space-y-4">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Kampanye
        </Link>
        <div className="border-b border-[rgba(255,255,255,0.06)] pb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-500" />
            Konfigurasi Kampanye Baru
          </h1>
          <p className="text-gray-400 text-sm mt-1.5">
            Tentukan target industri dan lokasi pencarian Anda untuk memicu Playwright crawler.
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="glass-panel-glow p-8 rounded-2xl border border-[rgba(255,255,255,0.06)] space-y-6">
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Niche / Kategori */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-4 h-4 text-violet-400" />
            Niche / Kategori Bisnis
          </label>
          <input
            type="text"
            placeholder="Misal: restoran, klinik, salon, hotel..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 text-white placeholder-gray-600 text-sm outline-none transition-all duration-300"
            required
            disabled={loading}
          />
          {/* Presets Grid */}
          <div className="flex flex-wrap gap-2 pt-1.5">
            {nichePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setNiche(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  niche.toLowerCase() === preset.toLowerCase()
                    ? "bg-violet-600/25 border-violet-500/50 text-white"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.1)]"
                }`}
                disabled={loading}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* City / Kota */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-violet-400" />
            Kota / Lokasi Target
          </label>
          <input
            type="text"
            placeholder="Misal: Surabaya, Jakarta Barat, Malang..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 text-white placeholder-gray-600 text-sm outline-none transition-all duration-300"
            required
            disabled={loading}
          />
          {/* City Presets */}
          <div className="flex flex-wrap gap-2 pt-1.5">
            {cityPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCity(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  city.toLowerCase() === preset.toLowerCase()
                    ? "bg-violet-600/25 border-violet-500/50 text-white"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.1)]"
                }`}
                disabled={loading}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Scrape Limit */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-violet-400" />
              Limit Prospek Lead
            </label>
            <span className="text-sm font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-lg">
              {limitCount} Leads
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={limitCount}
            onChange={(e) => setLimitCount(parseInt(e.target.value, 10))}
            className="w-full h-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] appearance-none cursor-pointer accent-violet-500"
            disabled={loading}
          />
          <div className="flex justify-between text-[10px] font-semibold text-gray-500 px-1">
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>25</span>
            <span>30 (Maks)</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm transition-all duration-300 shadow-xl shadow-violet-500/15 disabled:opacity-50 disabled:hover:bg-violet-600 disabled:scale-100 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              Memulai Scraper di Background...
            </>
          ) : (
            <>
              <Compass className="w-4.5 h-4.5" />
              Jalankan Pencarian Prospek
            </>
          )}
        </button>
      </form>

      {/* Helpful Scraping Warning box */}
      <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-400">Tips Optimasi Pencarian & Anti-Bot</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            1. **Gunakan istilah bahasa Indonesia**: maps bekerja lebih baik jika Anda mengetik kata kunci umum seperti <code className="px-1 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-gray-300 font-mono">restoran</code> daripada <code className="px-1 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-gray-300 font-mono">restaurant</code>.
          </p>
          <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
            2. **Kecepatan Scraping**: Setiap sesi memakan waktu sekitar **15 - 30 detik per lead** karena sistem menerapkan *random delay* antarklik untuk mensimulasikan perilaku manusia dan menghindari pemblokiran IP oleh Google.
          </p>
        </div>
      </div>
    </div>
  );
}
