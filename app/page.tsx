import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import {
  Users,
  Search,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  PlusCircle,
  KanbanSquare,
  Sparkles,
  Zap,
} from "lucide-react";

// Force dynamic rendering so database queries are refreshed on every visit
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Query statistics from SQLite database directly
  const totalLeads = await prisma.lead.count();
  
  const avgScoreRes = await prisma.lead.aggregate({
    _avg: {
      score: true,
    },
  });
  const averageScore = avgScoreRes._avg.score ? Math.round(avgScoreRes._avg.score) : 0;

  const totalApproved = await prisma.lead.count({
    where: { status: "approved" },
  });

  const totalContacted = await prisma.lead.count({
    where: { status: "contacted" },
  });

  const totalClosedWon = await prisma.lead.count({
    where: { status: "closed_won" },
  });

  const recentSessions = await prisma.scrapingSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    {
      name: "Total Leads",
      value: totalLeads,
      description: "Bisnis yang ter-scrape",
      icon: Users,
      color: "from-violet-500 to-indigo-500",
      shadow: "shadow-violet-500/10",
    },
    {
      name: "Rata-Rata Skor",
      value: `${averageScore}/150`,
      description: "Tingkat potensi prospek",
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/10",
    },
    {
      name: "Approved WA",
      value: totalApproved,
      description: "Pesan outreach siap kirim",
      icon: CheckCircle,
      color: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/10",
    },
    {
      name: "Total Contacted",
      value: totalContacted,
      description: "Sudah dihubungi via WA",
      icon: MessageSquare,
      color: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/10",
    },
    {
      name: "Closed Won",
      value: totalClosedWon,
      description: "Klien berhasil di-closing",
      icon: Zap,
      color: "from-rose-500 to-pink-500",
      shadow: "shadow-rose-500/10",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[rgba(255,255,255,0.06)] pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-8 h-8 text-violet-500" />
            Outreach Control Room
          </h1>
          <p className="text-gray-400 text-sm mt-1.5">
            Sistem otomatisasi penemuan klien & scoring berbasis AI untuk IT Agency Anda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            Pencarian Baru
          </Link>
          <Link
            href="/crm"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.06)] font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <KanbanSquare className="w-4 h-4 text-violet-400" />
            Pipeline CRM
          </Link>
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`glass-panel-glow p-6 rounded-2xl flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden group shadow-lg ${stat.shadow}`}
            >
              {/* Decorative Corner Glow */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-tr from-violet-600/5 to-indigo-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
                  {stat.name}
                </span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-[11px] text-gray-500 mt-1 font-medium">
                  {stat.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Panel grid: Left (Recent Sessions) - Right (CRM Quick Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Scraping Sessions */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-violet-400" />
              Aktivitas Pencarian Terakhir
            </h2>
            <Link
              href="/campaigns"
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 hover:underline"
            >
              Semua Sesi
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="py-12 px-4 rounded-xl border border-dashed border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] text-center">
              <div className="w-12 h-12 rounded-full bg-violet-950/30 flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                <Search className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Belum Ada Sesi Pencarian</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                Anda belum menjalankan pencarian leads Google Maps. Mulailah scrape prospek pertamamu sekarang!
              </p>
              <Link
                href="/campaigns/new"
                className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-all shadow-md shadow-violet-500/10 hover:scale-[1.02]"
              >
                Jalankan Scraper Pertama
                <PlusCircle className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] text-gray-400 font-semibold text-xs tracking-wider uppercase">
                    <th className="pb-3.5">Kategori / Niche</th>
                    <th className="pb-3.5">Kota / Lokasi</th>
                    <th className="pb-3.5">Status</th>
                    <th className="pb-3.5 text-center">Total Lead</th>
                    <th className="pb-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)] font-medium text-gray-300">
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="group hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                      <td className="py-4 text-white font-bold">{session.niche}</td>
                      <td className="py-4">{session.city}</td>
                      <td className="py-4">
                        {session.status === "done" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Selesai
                          </span>
                        )}
                        {session.status === "running" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse">
                            Scraping...
                          </span>
                        )}
                        {session.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gray-500/10 text-gray-400 border border-gray-500/20">
                            Menunggu
                          </span>
                        )}
                        {session.status === "failed" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            Gagal
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-center font-bold text-white">
                        {session.totalFound} <span className="text-gray-500 font-normal">/ {session.limitCount}</span>
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={`/campaigns/${session.id}`}
                          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-violet-600 border border-transparent hover:border-violet-500/30 transition-all font-bold"
                        >
                          Review Leads
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Agency Quick Workflow & System Notes */}
        <div className="glass-panel p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-amber-400" />
              Sistem Alur Kerja
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3.5">
                <div className="w-6.5 h-6.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Discovery (Scraper)</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Scrape Google Maps berdasarkan kata kunci industri dan kota target.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5">
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">AI Scoring & Matcher</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Sistem mendeteksi website, instagram, rating, ulasan untuk menghitung skor potensi proyek.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5">
                <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Gemini AI Copywriting</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Menganalisis celah digital lead dan menulis pesan pendekatan kustom di WhatsApp.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5">
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Human-in-the-Loop Review</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Anda meninjau skor, merevisi teks yang kurang pas, lalu klik Approve & Kirim.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[rgba(255,255,255,0.05)] mt-6 text-center text-xs text-gray-500 leading-relaxed font-medium">
            Ingatlah untuk mengatur API Key Anda di file <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-gray-300 font-mono text-[10px]">.env</code> untuk mengaktifkan generator proposal otomatis via Gemini.
          </div>
        </div>
      </div>
    </div>
  );
}
