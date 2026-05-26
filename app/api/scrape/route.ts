import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { scrapeGoogleMaps } from "@/lib/scraper/playwright";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { city, niche, limitCount } = body;

    if (!city || !niche) {
      return NextResponse.json(
        { error: "Kota (city) dan Kategori (niche) wajib diisi." },
        { status: 400 }
      );
    }

    const maxLimit = Math.min(Math.max(parseInt(limitCount, 10) || 10, 1), 50);

    // Anti-concurrency check: don't run more than one scraping job at a time
    const runningSession = await prisma.scrapingSession.findFirst({
      where: { status: "running" },
    });

    if (runningSession) {
      return NextResponse.json(
        {
          error: `Sesi pencarian untuk "${runningSession.niche}" di "${runningSession.city}" sedang berjalan. Silakan tunggu hingga sesi tersebut selesai.`,
        },
        { status: 429 }
      );
    }

    // Create a new scraping session
    const session = await prisma.scrapingSession.create({
      data: {
        city: city.trim(),
        niche: niche.trim(),
        limitCount: maxLimit,
        status: "pending",
        totalFound: 0,
      },
    });

    // Run the scraper in the background
    scrapeGoogleMaps(session.id, session.city, session.niche, session.limitCount)
      .catch((err) => {
        console.error(`Background scraper exception in session ${session.id}:`, err);
      });

    return NextResponse.json({
      success: true,
      message: "Scraping session started successfully.",
      session,
    });
  } catch (error) {
    console.error("Error in POST /api/scrape:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
