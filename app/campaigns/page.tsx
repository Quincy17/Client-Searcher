import { prisma } from "@/lib/db/prisma";
import { CampaignListClient } from "./CampaignListClient";
import { Compass } from "lucide-react";

// Disable build cache caching, fetch directly on every request
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const sessions = await prisma.scrapingSession.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
      {/* Title Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] pb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Compass className="w-8 h-8 text-violet-500" />
          Kampanye Pencarian Leads
        </h1>
        <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
          Tinjau semua kampanye pencarian Google Maps yang pernah dilakukan. Anda dapat melihat perkembangan pencarian, menganalisis kualitas prospek, dan menghapus sesi yang sudah tidak diperlukan.
        </p>
      </div>

      {/* Main Campaign List Grid (Client Side) */}
      <CampaignListClient initialSessions={sessions} />
    </div>
  );
}
