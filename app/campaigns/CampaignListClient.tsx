"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Users,
  Compass,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface Session {
  id: number;
  city: string;
  niche: string;
  limitCount: number;
  status: string;
  totalFound: number;
  createdAt: Date | string;
}

export function CampaignListClient({ initialSessions }: { initialSessions: Session[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Filter sessions based on search keyword
  const filteredSessions = initialSessions.filter(
    (session) =>
      session.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        alert("Gagal menghapus kampanye.");
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* Search Bar & Add Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari kata kunci niche atau kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 text-white placeholder-gray-500 text-sm outline-none transition-all duration-300"
          />
        </div>

        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-violet-500/25 w-full sm:w-auto justify-center hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Mulai Pencarian Baru
        </Link>
      </div>

      {/* Campaigns Grid */}
      {filteredSessions.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-2xl border border-[rgba(255,255,255,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-violet-950/30 flex items-center justify-center mx-auto mb-5 border border-violet-500/20">
            <Compass className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Tidak Ada Kampanye Ditemukan</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed">
            {searchTerm
              ? `Pencarian "${searchTerm}" tidak cocok dengan kampanye apa pun.`
              : "Anda belum pernah melakukan pencarian leads. Silakan buat kampanye baru."}
          </p>
          {!searchTerm && (
            <Link
              href="/campaigns/new"
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all duration-300"
            >
              Jalankan Scraper Pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="glass-panel-glow rounded-2xl border border-[rgba(255,255,255,0.06)] hover:border-violet-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group"
            >
              {/* Card Body */}
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight capitalize truncate max-w-[200px]">
                      {session.niche}
                    </h3>
                    <p className="text-xs text-violet-400 font-semibold tracking-wide uppercase mt-1">
                      {session.city}
                    </p>
                  </div>
                  
                  {/* Status Badges */}
                  <div>
                    {session.status === "done" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Selesai
                      </span>
                    )}
                    {session.status === "running" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse">
                        Scraping
                      </span>
                    )}
                    {session.status === "pending" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        Pending
                      </span>
                    )}
                    {session.status === "failed" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                        Gagal
                      </span>
                    )}
                  </div>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-2 gap-4 py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Lead</span>
                    <span className="text-lg font-black text-white flex items-center gap-1.5 mt-0.5">
                      <Users className="w-4 h-4 text-violet-400 shrink-0" />
                      {session.totalFound}
                      <span className="text-xs font-normal text-gray-500">/ {session.limitCount}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Tanggal</span>
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mt-1 truncate">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer / Actions */}
              <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.15)] flex items-center justify-between gap-3">
                {confirmDeleteId === session.id ? (
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Hapus semua data?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deletingId === session.id}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
                      >
                        {deletingId === session.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Ya"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-gray-300 font-bold text-xs transition-colors shrink-0"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmDeleteId(session.id)}
                      className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <Link
                      href={`/campaigns/${session.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-all shadow-md shadow-violet-500/10 hover:scale-[1.02]"
                    >
                      Buka Hasil Leads
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
