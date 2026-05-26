"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Compass,
  Star,
  MapPin,
  Phone,
  Globe,
  PlusCircle,
  MessageSquare,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Send,
  Loader2,
  ChevronRight,
  ArrowRight,
  NotebookText,
} from "lucide-react";

interface OutreachMessage {
  id: number;
  messageText: string;
  waLink: string | null;
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
  score: number;
  recommendedService: string | null;
  status: string;
  followUpCount: number;
  notes: string | null;
  createdAt: Date | string;
  outreachMessages: OutreachMessage[];
  session: {
    city: string;
    niche: string;
  };
}

interface CRMClientProps {
  initialLeads: Lead[];
}

export function CRMClient({ initialLeads }: CRMClientProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);

  // Group leads into 5 logical CRM lanes
  const getLaneLeads = (laneName: string) => {
    return leads.filter((lead) => {
      switch (laneName) {
        case "inbox":
          return lead.status === "raw" || lead.status === "scored";
        case "approved":
          return lead.status === "approved";
        case "contacted":
          return lead.status === "contacted";
        case "negotiation":
          return (
            lead.status === "replied" ||
            lead.status === "interested" ||
            lead.status === "proposal_sent"
          );
        case "closed":
          return lead.status === "closed_won" || lead.status === "closed_lost";
        default:
          return false;
      }
    });
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state dynamically
        setLeads((prevLeads) =>
          prevLeads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        // If the selected lead is active, update it too
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
        }
        router.refresh();
      } else {
        alert("Gagal memindahkan lead.");
      }
    } catch (e) {
      alert("Kesalahan jaringan.");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleSaveNotes = async (leadId: number) => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput }),
      });

      if (res.ok) {
        setLeads((prevLeads) =>
          prevLeads.map((l) => (l.id === leadId ? { ...l, notes: notesInput } : l))
        );
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, notes: notesInput } : null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setNotesInput(lead.notes || "");
  };

  const handleOutreach = async (lead: Lead) => {
    const latestMsg = lead.outreachMessages?.[0];
    if (!latestMsg) return;

    try {
      await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
    } catch (e) {
      console.error(e);
    }

    const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
    let normalizedPhone = cleanPhone;
    if (cleanPhone.startsWith("08")) {
      normalizedPhone = "62" + cleanPhone.substring(1);
    }
    
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(latestMsg.messageText)}`, "_blank");

    // Move lead to contacted lane locally
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === lead.id ? { ...l, status: "contacted", followUpCount: l.followUpCount + 1 } : l
      )
    );
    router.refresh();
  };

  const lanes = [
    {
      id: "inbox",
      title: "Discovery / Baru",
      bgHeader: "border-gray-500/20 text-gray-400 bg-gray-500/5",
      icon: Compass,
      textColor: "text-gray-400",
    },
    {
      id: "approved",
      title: "Siap Outreach",
      bgHeader: "border-violet-500/20 text-violet-400 bg-violet-500/5",
      icon: Award,
      textColor: "text-violet-400",
    },
    {
      id: "contacted",
      title: "Outreach Terkirim",
      bgHeader: "border-blue-500/20 text-blue-400 bg-blue-500/5",
      icon: MessageSquare,
      textColor: "text-blue-400",
    },
    {
      id: "negotiation",
      title: "Negosiasi Aktif",
      bgHeader: "border-amber-500/20 text-amber-400 bg-amber-500/5",
      icon: TrendingUp,
      textColor: "text-amber-400",
    },
    {
      id: "closed",
      title: "Closing Deal",
      bgHeader: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
      icon: CheckCircle2,
      textColor: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Kanban Board Container */}
      <div className="flex gap-6 overflow-x-auto pb-6 min-h-[70vh] items-start scrollbar-thin">
        {lanes.map((lane) => {
          const laneLeads = getLaneLeads(lane.id);
          const Icon = lane.icon;

          return (
            <div
              key={lane.id}
              className="w-80 shrink-0 flex flex-col rounded-2xl bg-[rgba(10,8,22,0.45)] border border-[rgba(255,255,255,0.04)] overflow-hidden"
            >
              {/* Lane Header */}
              <div className={`p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between font-bold text-xs tracking-wider uppercase ${lane.bgHeader}`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{lane.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-white font-black font-mono">
                  {laneLeads.length}
                </span>
              </div>

              {/* Lane Leads Grid */}
              <div className="p-3.5 space-y-3.5 overflow-y-auto max-h-[62vh] min-h-[400px]">
                {laneLeads.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-600 font-semibold border border-dashed border-[rgba(255,255,255,0.03)] rounded-xl bg-[rgba(255,255,255,0.005)]">
                    Kosong
                  </div>
                ) : (
                  laneLeads.map((lead) => {
                    let scoreBg = "bg-rose-500/10 text-rose-400 border-rose-500/10";
                    if (lead.score >= 100) {
                      scoreBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
                    } else if (lead.score >= 60) {
                      scoreBg = "bg-amber-500/10 text-amber-400 border-amber-500/10";
                    }

                    const hasPhone = !!lead.phone;
                    const latestMsg = lead.outreachMessages?.[0];

                    return (
                      <div
                        key={lead.id}
                        className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-violet-500/20 hover:bg-[rgba(255,255,255,0.03)] transition-all duration-300 shadow-md group relative cursor-pointer"
                        onClick={() => handleOpenDetails(lead)}
                      >
                        {/* Quick Loading Overlay */}
                        {updatingLeadId === lead.id && (
                          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center backdrop-blur-xs z-10">
                            <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                          </div>
                        )}

                        <div className="space-y-3">
                          {/* Business Title & Score */}
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-white text-sm tracking-tight leading-snug group-hover:text-violet-400 transition-colors truncate max-w-[170px]">
                                {lead.name}
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border font-mono ${scoreBg}`}>
                                {lead.score}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide block mt-0.5">
                              {lead.category || "Bisnis"} · {lead.session.city}
                            </span>
                          </div>

                          {/* Quick details */}
                          <div className="flex items-center gap-2">
                            {lead.rating && (
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-bold">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                {lead.rating}
                                <span className="text-gray-500 font-normal">({lead.reviewCount})</span>
                              </span>
                            )}
                            
                            {lead.notes && (
                              <span className="flex items-center gap-0.5 text-[10px] text-violet-400 font-semibold bg-violet-500/5 px-1.5 py-0.5 rounded">
                                <NotebookText className="w-3 h-3" /> Catatan
                              </span>
                            )}
                          </div>

                          {/* Quick CRM Action Button Row */}
                          <div
                            className="pt-2 border-t border-[rgba(255,255,255,0.03)] flex gap-1.5 justify-end"
                            onClick={(e) => e.stopPropagation()} // avoid triggering modal open
                          >
                            {lane.id === "inbox" && (
                              <button
                                onClick={() => handleStatusChange(lead.id, "approved")}
                                className="px-2 py-1 rounded bg-violet-600/10 hover:bg-violet-600 border border-violet-500/25 hover:border-violet-500 hover:text-white text-violet-400 text-[10px] font-black transition-colors"
                              >
                                Approve
                              </button>
                            )}

                            {lane.id === "approved" && latestMsg && (
                              <button
                                onClick={() => handleOutreach(lead)}
                                disabled={!hasPhone}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-md shadow-emerald-500/15 disabled:opacity-40"
                              >
                                <Send className="w-2.5 h-2.5" /> Kirim WA
                              </button>
                            )}

                            {lane.id === "contacted" && (
                              <div className="flex gap-1 w-full justify-between items-center">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                  Follow-up: {lead.followUpCount}x
                                </span>
                                <button
                                  onClick={() => handleStatusChange(lead.id, "replied")}
                                  className="px-2 py-1 rounded bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-[10px] font-black transition-all"
                                >
                                  Merespons
                                </button>
                              </div>
                            )}

                            {lane.id === "negotiation" && (
                              <div className="flex gap-1 w-full justify-between">
                                <button
                                  onClick={() => handleStatusChange(lead.id, "proposal_sent")}
                                  className="px-2 py-1 rounded bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white border border-[rgba(255,255,255,0.05)] text-[10px] font-bold transition-all"
                                >
                                  Proposal
                                </button>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleStatusChange(lead.id, "closed_won")}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-all"
                                  >
                                    Won
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(lead.id, "closed_lost")}
                                    className="px-2 py-1 rounded bg-rose-950/20 hover:bg-rose-900 border border-rose-500/20 text-rose-400 hover:text-white text-[10px] font-bold transition-all"
                                  >
                                    Lost
                                  </button>
                                </div>
                              </div>
                            )}

                            {lane.id === "closed" && (
                              <div className="w-full text-center">
                                {lead.status === "closed_won" ? (
                                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Deal Closing!
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center justify-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> Deal Lost
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details & Notes Overlay Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
          <div
            className="w-full max-w-lg rounded-2xl glass-panel-glow border border-violet-500/25 overflow-hidden flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)] flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedLead.name}
                </h3>
                <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider block mt-1">
                  {selectedLead.category || "Bisnis"} · {selectedLead.session.city}
                </span>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Contact and Links */}
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] space-y-3">
                {selectedLead.address && (
                  <div className="flex gap-2 text-xs text-gray-300">
                    <MapPin className="w-4.5 h-4.5 text-gray-500 shrink-0 mt-0.5" />
                    <span>{selectedLead.address}</span>
                  </div>
                )}
                <div className="flex gap-2 text-xs text-gray-300">
                  <Phone className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                  {selectedLead.phone ? (
                    <span className="font-mono text-white font-semibold">{selectedLead.phone}</span>
                  ) : (
                    <span className="text-rose-400 font-semibold italic">Tidak ada nomor telepon</span>
                  )}
                </div>
                <div className="flex gap-2 text-xs text-gray-300">
                  <Globe className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                  {selectedLead.website ? (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:text-violet-300 hover:underline font-semibold flex items-center gap-1 truncate"
                    >
                      {selectedLead.website}
                    </a>
                  ) : (
                    <span className="text-amber-500 font-semibold italic">Tidak memiliki website</span>
                  )}
                </div>
              </div>

              {/* Status and scoring stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Skor Potensi Prospek</span>
                  <span className="text-xl font-black text-white mt-1 block">
                    {selectedLead.score} <span className="text-xs text-gray-500 font-normal">/ 150</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Status Pipeline</span>
                  <span className="text-xs font-black text-violet-400 mt-2 block uppercase tracking-wider">
                    {selectedLead.status}
                  </span>
                </div>
              </div>

              {/* Recommended Service */}
              <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/25">
                <span className="text-[9px] text-violet-400 font-black tracking-wider uppercase block mb-1">Rekomendasi Penawaran Layanan</span>
                <span className="text-xs font-extrabold text-white">
                  {selectedLead.recommendedService || "Company profile web + portfolio"}
                </span>
              </div>

              {/* Notes Editor inside Modal */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Catatan Aktivitas Follow-up</label>
                <textarea
                  rows={4}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Misal: 'Sudah di-Outreach tanggal 20 Mei. Owner akan mendiskusikan penawaran ini dengan partner bisnisnya minggu depan...'"
                  className="w-full px-3.5 py-3 text-xs rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] focus:border-violet-500/40 text-gray-200 outline-none placeholder-gray-600 resize-none transition-colors"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)] flex justify-between items-center gap-3">
              {/* Dynamic Action inside Modal */}
              <div className="flex items-center gap-1.5">
                {selectedLead.status === "contacted" && (
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "replied")}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    Set Merespons
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {selectedLead.status === "replied" && (
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "proposal_sent")}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    Set Proposal Terkirim
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {(selectedLead.status === "proposal_sent" || selectedLead.status === "interested" || selectedLead.status === "replied") && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedLead.id, "closed_won")}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors"
                    >
                      Closing Won!
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedLead.id, "closed_lost")}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/20 hover:bg-rose-900 text-rose-400 text-xs font-bold transition-colors"
                    >
                      Lost
                    </button>
                  </div>
                )}
              </div>

              {/* Notes Save Trigger */}
              <button
                onClick={() => handleSaveNotes(selectedLead.id)}
                disabled={savingNotes || selectedLead.notes === notesInput}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-[rgba(255,255,255,0.02)] text-white disabled:text-gray-500 border border-transparent disabled:border-[rgba(255,255,255,0.04)] font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {savingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Catatan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
