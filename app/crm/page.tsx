import { prisma } from "@/lib/db/prisma";
import { CRMClient } from "./CRMClient";
import { KanbanSquare } from "lucide-react";

// Force database re-fetch on every request to get live CRM board updates
export const dynamic = "force-dynamic";

export default async function CRMPage() {
  const leads = await prisma.lead.findMany({
    include: {
      session: {
        select: {
          city: true,
          niche: true,
        },
      },
      outreachMessages: {
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      score: "desc",
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Title Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <KanbanSquare className="w-8 h-8 text-violet-500" />
          CRM Pipeline
        </h1>
        <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
          Kelola kemajuan pendekatan penjualan Anda secara terpusat untuk semua kampanye. Geser prospek dari kotak masuk (inbox), kirimkan pesan pendekatan awal via WhatsApp, ikuti negosiasi proposal aktif, hingga mencapai closing deal kerja sama!
        </p>
      </div>

      {/* Main CRM Board Client Component */}
      <CRMClient initialLeads={leads} />
    </div>
  );
}
