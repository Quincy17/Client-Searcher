"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  CheckCircle,
  XCircle,
  RotateCw,
  Send,
  Loader2,
  FileText,
  Bookmark,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Custom vector identical Instagram SVG icon to avoid lucide-react package version mismatches
const InstagramIcon = ({ className = "w-4.5 h-4.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface OutreachMessage {
  id: number;
  messageText: string;
  version: number;
  waLink: string | null;
  approvedAt: string | null;
}

interface Lead {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  instagramUrl: string | null;
  hasWebsite: boolean;
  hasCustomEmail: boolean;
  score: number;
  recommendedService: string | null;
  status: string;
  followUpCount: number;
  notes: string | null;
  outreachMessages: OutreachMessage[];
}

interface Session {
  id: number;
  city: string;
  niche: string;
  limitCount: number;
  status: string;
  totalFound: number;
  createdAt: string;
  leads: Lead[];
}

export function CampaignDetailClient({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  
  // UX UI States
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [editableMessages, setEditableMessages] = useState<{ [leadId: number]: string }>({});
  const [savingNotes, setSavingNotes] = useState<{ [leadId: number]: boolean }>({});
  const [notesText, setNotesText] = useState<{ [leadId: number]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [leadId: string]: boolean }>({});

  // Filter States
  const [scoreFilter, setScoreFilter] = useState("all"); // all, high, medium, low
  const [statusFilter, setStatusFilter] = useState("all"); // all, scored, approved, contacted, rejected

  // Real-time status polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchSessionDetails = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          
          // Populate editable message texts for new leads
          const msgs: { [leadId: number]: string } = {};
          const notes: { [leadId: number]: string } = {};
          
          data.session.leads.forEach((lead: Lead) => {
            if (editableMessages[lead.id] === undefined && lead.outreachMessages?.[0]) {
              msgs[lead.id] = lead.outreachMessages[0].messageText;
            }
            if (notesText[lead.id] === undefined) {
              notes[lead.id] = lead.notes || "";
            }
          });
          
          if (Object.keys(msgs).length > 0) {
            setEditableMessages(prev => ({ ...prev, ...msgs }));
          }
          if (Object.keys(notes).length > 0) {
            setNotesText(prev => ({ ...prev, ...notes }));
          }

          // Stop polling if session is not active
          if (data.session.status === "done" || data.session.status === "failed") {
            setPolling(false);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();

    if (polling) {
      intervalId = setInterval(fetchSessionDetails, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId, polling]);

  const handleUpdateStatus = async (leadId: number, status: string, customMessage?: string) => {
    setActionLoading(prev => ({ ...prev, [`${leadId}-${status}`]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          messageText: customMessage,
        }),
      });

      if (res.ok) {
        // Refresh local state by fetching details immediately
        const detailRes = await fetch(`/api/sessions/${sessionId}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setSession(data.session);
        }
      } else {
        alert("Gagal memperbarui lead.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`${leadId}-${status}`]: false }));
    }
  };

  const handleSaveNotes = async (leadId: number) => {
    setSavingNotes(prev => ({ ...prev, [leadId]: true }));
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesText[leadId],
        }),
      });
    } catch (e) {
      console.error("Error saving notes", e);
    } finally {
      setSavingNotes(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const handleRegenerateProposal = async (leadId: number) => {
    setActionLoading(prev => ({ ...prev, [`${leadId}-regen`]: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local text area
        setEditableMessages(prev => ({
          ...prev,
          [leadId]: data.outreachMessage.messageText,
        }));
        
        // Refresh session
        const detailRes = await fetch(`/api/sessions/${sessionId}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setSession(data.session);
        }
      } else {
        alert("Gagal me-regenerate proposal.");
      }
    } catch (e) {
      alert("Kesalahan jaringan.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`${leadId}-regen`]: false }));
    }
  };

  const handleOutreachClick = async (lead: Lead) => {
    const latestMsg = lead.outreachMessages?.[0];
    if (!latestMsg) return;

    // Send the tracking request in the background
    try {
      await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
    } catch (e) {
      console.error("Error tracking outreach", e);
    }

    // Immediately open WA link
    const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
    let normalizedPhone = cleanPhone;
    if (cleanPhone.startsWith("08")) {
      normalizedPhone = "62" + cleanPhone.substring(1);
    }
    
    const textMsg = editableMessages[lead.id] || latestMsg.messageText;
    const finalWaLink = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(textMsg)}`;
    
    window.open(finalWaLink, "_blank");

    // Refresh state
    const detailRes = await fetch(`/api/sessions/${sessionId}`);
    if (detailRes.ok) {
      const data = await detailRes.json();
      setSession(data.session);
    }
  };

  if (loading && !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        <span className="text-sm text-gray-400 font-semibold">Memuat detail kampanye...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto py-20 space-y-4">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Kampanye Tidak Ditemukan</h2>
        <p className="text-sm text-gray-400">ID kampanye yang Anda minta tidak terdaftar di database kami.</p>
        <Link href="/campaigns" className="inline-block px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs">
          Kembali ke List Kampanye
        </Link>
      </div>
    );
  }

  // Filter logic applied client-side
  const filteredLeads = session.leads.filter((lead) => {
    // 1. Score filter
    if (scoreFilter === "high" && lead.score < 100) return false;
    if (scoreFilter === "medium" && (lead.score < 60 || lead.score >= 100)) return false;
    if (scoreFilter === "low" && lead.score >= 60) return false;

    // 2. Status filter
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;

    return true;
  });

  // Calculate score breakdowns for visual display
  const getScoreBreakdown = (lead: Lead) => {
    const points = [];
    if (!lead.website) {
      points.push({ label: "Tidak memiliki website", score: "+40" });
    } else {
      const isBio = /linktr\.ee|biolinky|instagram\.com|facebook\.com|wa\.me/i.test(lead.website);
      if (isBio) {
        points.push({ label: "Website hanya berupa link bio / media sosial", score: "+30" });
      }
    }
    if (lead.rating && lead.rating > 4.0) {
      points.push({ label: `Google Maps Rating > 4.0 (${lead.rating})`, score: "+20" });
    }
    if (!lead.website || /linktr\.ee|biolinky|instagram\.com|facebook\.com|wa\.me/i.test(lead.website || "")) {
      points.push({ label: "Belum memiliki landing page resmi", score: "+20" });
    }
    if (lead.reviewCount && lead.reviewCount > 20) {
      points.push({ label: `Ulasan Google Maps > 20 (${lead.reviewCount})`, score: "+15" });
    }
    if (!lead.hasCustomEmail) {
      points.push({ label: "Tidak terdeteksi domain email bisnis kustom", score: "+15" });
    }
    if (lead.instagramUrl) {
      points.push({ label: "Mencantumkan profil Instagram", score: "+10" });
    }
    return points;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      
      {/* Header and Back Link */}
      <div className="space-y-4">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Kampanye
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[rgba(255,255,255,0.06)] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 capitalize">
              {session.niche} di {session.city}
            </h1>
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
              Tinjau ulasan, atur status prospek, revisi pesan outreach WA, dan kirimkan proposal kustom AI.
            </p>
          </div>
          {polling && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold text-xs animate-pulse">
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Scraper Maps Sedang Berjalan... ({session.totalFound} / {session.limitCount} Leads)</span>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Summary & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total stats card */}
        <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Ditemukan</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {session.leads.length} Leads
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Filter Score */}
        <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] space-y-2.5">
          <label className="text-[10px] text-gray-500 uppercase font-semibold block flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Filter Potensi Prospek
          </label>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-xl px-3 py-2 text-xs font-semibold text-gray-300 outline-none focus:border-violet-500/40"
          >
            <option value="all">Semua Skor</option>
            <option value="high">High Potency (&ge; 100)</option>
            <option value="medium">Medium Potency (60-99)</option>
            <option value="low">Low Potency (&lt; 60)</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] space-y-2.5">
          <label className="text-[10px] text-gray-500 uppercase font-semibold block flex items-center gap-1">
            <Bookmark className="w-3 h-3" /> Filter Status Review
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-xl px-3 py-2 text-xs font-semibold text-gray-300 outline-none focus:border-violet-500/40"
          >
            <option value="all">Semua Status</option>
            <option value="scored">Scored (Belum Review)</option>
            <option value="approved">Approved (Siap WA)</option>
            <option value="contacted">Contacted (Sudah Hubungi)</option>
            <option value="rejected">Rejected (Dilewati)</option>
          </select>
        </div>

        {/* Info card */}
        <div className="glass-panel p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs text-gray-400 leading-normal">
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <span>Klik salah satu baris lead di bawah ini untuk melihat detail skor digital dan mengedit pesan WhatsApp.</span>
          </div>
        </div>
      </div>

      {/* Leads Table / List Container */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="py-20 text-center glass-panel rounded-2xl border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-base font-bold text-white">Tidak Ada Leads yang Cocok</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Tidak ada data prospek lead yang memenuhi filter yang Anda pilih saat ini.
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isExpanded = expandedLeadId === lead.id;
            const latestMessage = lead.outreachMessages?.[0];
            const hasPhone = !!lead.phone;
            const isApproved = lead.status === "approved";
            const isContacted = lead.status === "contacted" || lead.status === "replied" || lead.status === "interested" || lead.status === "proposal_sent" || lead.status === "closed_won";
            const isRejected = lead.status === "rejected";

            // Determine score color badge
            let scoreBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            let scoreLabel = "Low Potency";
            if (lead.score >= 100) {
              scoreBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              scoreLabel = "High Potency";
            } else if (lead.score >= 60) {
              scoreBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              scoreLabel = "Medium Potency";
            }

            return (
              <div
                key={lead.id}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "bg-[rgba(15,12,30,0.85)] border-violet-500/40 shadow-xl shadow-violet-500/5"
                    : isRejected
                    ? "bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.03)] opacity-40 hover:opacity-75"
                    : "glass-panel border-[rgba(255,255,255,0.06)] hover:border-violet-500/20"
                }`}
              >
                {/* Collapsed Bar / Click Header */}
                <div
                  onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <h3 className="font-bold text-white text-base tracking-tight truncate max-w-sm">
                        {lead.name}
                      </h3>
                      {/* Score Badge */}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border tracking-wide uppercase ${scoreBg}`} title={scoreLabel}>
                        Skor: {lead.score}
                      </span>
                      {/* Rating Badge */}
                      {lead.rating && (
                        <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] text-xs text-gray-300 font-bold">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {lead.rating}
                          <span className="text-[10px] text-gray-500 font-normal">({lead.reviewCount})</span>
                        </span>
                      )}
                    </div>
                    
                    {/* Category & Lokasi */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold truncate capitalize">
                      <span>{lead.category || "Bisnis"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-600" />
                        {lead.address || session.city}
                      </span>
                    </div>
                  </div>

                  {/* Right Tags & Indicators */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* Feature tags */}
                    <div className="hidden lg:flex items-center gap-1.5">
                      {!lead.website ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/5 text-rose-400 text-[10px] font-bold border border-rose-500/10">No Website</span>
                      ) : /linktr\.ee|biolinky|instagram\.com|facebook\.com/i.test(lead.website) ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/5 text-amber-400 text-[10px] font-bold border border-amber-500/10">Social Bio Only</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/5 text-emerald-400 text-[10px] font-bold border border-emerald-500/10">Website Active</span>
                      )}
                      {lead.instagramUrl && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/5 text-indigo-400 text-[10px] font-bold border border-indigo-500/10 flex items-center gap-0.5">
                          <InstagramIcon className="w-2.5 h-2.5" /> IG
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="mr-2">
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Approved
                        </span>
                      )}
                      {isContacted && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Contacted ({lead.followUpCount})
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-gray-500/10 text-gray-500 border border-gray-500/20">
                          Rejected
                        </span>
                      )}
                      {lead.status === "scored" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          Scored
                        </span>
                      )}
                    </div>

                    {/* Collapse icon */}
                    <div className="text-gray-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Review Panel */}
                {isExpanded && (
                  <div className="p-6 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Column: Digital Audit Details */}
                    <div className="space-y-6">
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-violet-400" />
                          Hasil Audit Kehadiran Digital
                        </h4>
                        
                        {/* Address, Phone, Website links */}
                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] space-y-3.5">
                          {lead.address && (
                            <div className="flex gap-2.5 text-xs text-gray-300">
                              <MapPin className="w-4.5 h-4.5 text-gray-500 shrink-0 mt-0.5" />
                              <span>{lead.address}</span>
                            </div>
                          )}
                          <div className="flex gap-2.5 text-xs text-gray-300">
                            <Phone className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                            {hasPhone ? (
                              <span className="font-mono text-white font-semibold">{lead.phone}</span>
                            ) : (
                              <span className="text-rose-400/80 font-semibold italic">Tidak ada nomor telepon</span>
                            )}
                          </div>
                          <div className="flex gap-2.5 text-xs text-gray-300">
                            <Globe className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                            {lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-violet-400 hover:text-violet-300 hover:underline font-semibold flex items-center gap-1 truncate"
                              >
                                {lead.website}
                              </a>
                            ) : (
                              <span className="text-amber-500 font-semibold italic">Tidak memiliki website</span>
                            )}
                          </div>
                          {lead.instagramUrl && (
                            <div className="flex gap-2.5 text-xs text-gray-300">
                              <InstagramIcon className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                              <a
                                href={lead.instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold flex items-center gap-1 truncate"
                              >
                                {lead.instagramUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Point Breakdown */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Rincian Penilaian Skor ({lead.score}/150)</span>
                        <div className="space-y-1.5">
                          {getScoreBreakdown(lead).map((pt, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] font-medium">
                              <span className="text-gray-400">{pt.label}</span>
                              <span className="text-violet-400 font-bold font-mono">{pt.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Service Callout */}
                      <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/25 space-y-1">
                        <span className="text-[10px] text-violet-400 uppercase font-black tracking-wider block">Rekomendasi Layanan Agency IT</span>
                        <span className="text-sm font-extrabold text-white">
                          {lead.recommendedService || "Company Profile Web + Portfolio"}
                        </span>
                      </div>

                      {/* Notes Box */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Catatan Tim CRM</label>
                          {savingNotes[lead.id] && (
                            <span className="text-[10px] text-violet-400 font-bold flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={notesText[lead.id] || ""}
                          onChange={(e) => setNotesText(prev => ({ ...prev, [lead.id]: e.target.value }))}
                          onBlur={() => handleSaveNotes(lead.id)}
                          placeholder="Ketik catatan di sini (tercantum otomatis di CRM, misal: 'Owner minta dihubungi minggu depan')"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] focus:border-violet-500/30 text-gray-300 outline-none placeholder-gray-600 resize-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Right Column: AI WhatsApp Proposal */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-violet-400" />
                          Draf Outreach WhatsApp (AI Generated)
                        </h4>
                        
                        {latestMessage && (
                          <span className="text-[10px] font-bold text-gray-500">
                            Versi {latestMessage.version}
                          </span>
                        )}
                      </div>

                      {/* Message Text Area */}
                      <div className="relative">
                        <textarea
                          rows={11}
                          value={editableMessages[lead.id] || ""}
                          onChange={(e) => setEditableMessages(prev => ({ ...prev, [lead.id]: e.target.value }))}
                          placeholder="Menghasilkan teks draf proposal WA..."
                          className="w-full px-4 py-3.5 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.05)] focus:border-violet-500/40 text-gray-200 outline-none text-xs leading-relaxed font-sans"
                        />
                      </div>

                      {/* Actions Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        
                        {/* Left Side: Reject & Regenerate */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(lead.id, "rejected")}
                            disabled={actionLoading[`${lead.id}-rejected`]}
                            className="px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs text-gray-400 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/15 font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Tolak Lead
                          </button>
                          
                          <button
                            onClick={() => handleRegenerateProposal(lead.id)}
                            disabled={actionLoading[`${lead.id}-regen`]}
                            className="px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            title="Tanya Gemini untuk menulis ulang pesan"
                          >
                            {actionLoading[`${lead.id}-regen`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCw className="w-3.5 h-3.5 text-violet-400" />
                            )}
                            Regenerate
                          </button>
                        </div>

                        {/* Right Side: Approve and Send WA */}
                        <div className="flex items-center gap-2">
                          
                          {/* Approve/Save Button */}
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                lead.id,
                                "approved",
                                editableMessages[lead.id]
                              )
                            }
                            disabled={actionLoading[`${lead.id}-approved`] || isApproved}
                            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                              isApproved
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/15"
                            }`}
                          >
                            {actionLoading[`${lead.id}-approved`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isApproved ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approved
                              </>
                            ) : (
                              "Approve Pesan"
                            )}
                          </button>

                          {/* Send WhatsApp (Visible if approved or already contacted) */}
                          {(isApproved || isContacted) && (
                            <button
                              onClick={() => handleOutreachClick(lead)}
                              disabled={!hasPhone}
                              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:hover:bg-emerald-600 cursor-pointer"
                              title={hasPhone ? "Buka di WhatsApp Web/App" : "Membutuhkan nomor telepon untuk mengirim pesan"}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Buka WA
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
