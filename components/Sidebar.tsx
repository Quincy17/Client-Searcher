"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Search,
  KanbanSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isScraping, setIsScraping] = useState(false);
  const [runningSession, setRunningSession] = useState<{ id: number; niche: string; city: string } | null>(null);

  // Poll for active scraping job in background every 5 seconds
  useEffect(() => {
    const checkScrapingStatus = async () => {
      try {
        const res = await fetch("/api/sessions/active");
        if (res.ok) {
          const data = await res.json();
          if (data.active && data.session) {
            setIsScraping(true);
            setRunningSession(data.session);
          } else {
            setIsScraping(false);
            setRunningSession(null);
          }
        }
      } catch (e) {
        // Suppress background errors
      }
    };

    checkScrapingStatus();
    const interval = setInterval(checkScrapingStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Scrape Campaign",
      href: "/campaigns",
      icon: Search,
    },
    {
      name: "CRM Pipeline",
      href: "/crm",
      icon: KanbanSquare,
    },
  ];

  return (
    <aside className="w-64 border-r border-[rgba(255,255,255,0.06)] bg-[rgba(10,8,22,0.65)] backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0 shrink-0">
      <div>
        {/* Logo and App Title */}
        <div className="p-6 border-b border-[rgba(255,255,255,0.05)]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-all">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white tracking-wide block">ClientSearcher</span>
              <span className="text-[10px] text-violet-400 font-medium tracking-wider uppercase">Lead Automation</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 group ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/25 to-indigo-500/10 text-white border border-violet-500/20 shadow-inner"
                    : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.03)] border border-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 group-hover:scale-105 ${
                    isActive ? "text-violet-400" : "text-gray-400 group-hover:text-violet-400"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Scraping status */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.15)]">
        {isScraping && runningSession ? (
          <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 flex flex-col gap-2 animate-pulse">
            <div className="flex items-center gap-2 text-[11px] text-violet-400 font-semibold tracking-wide uppercase">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Scraper Berjalan</span>
            </div>
            <div className="text-xs text-white font-medium truncate">
              {runningSession.niche} di {runningSession.city}
            </div>
            <Link
              href={`/campaigns/${runningSession.id}`}
              className="text-[10px] text-violet-300 hover:underline hover:text-white transition-colors"
            >
              Lihat progress &rarr;
            </Link>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] text-center text-xs text-gray-500">
            <div className="flex items-center justify-center gap-1.5 font-medium mb-0.5 text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
              <span>Sistem Siap</span>
            </div>
            <span>Tidak ada pencarian aktif</span>
          </div>
        )}
        <div className="mt-4 text-[10px] text-gray-600 text-center">
          v1.0 · Gemini 3.1 Flash (Free Tier)
        </div>
      </div>
    </aside>
  );
}
