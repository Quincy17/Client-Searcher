import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const activeSession = await prisma.scrapingSession.findFirst({
      where: { status: "running" },
      select: {
        id: true,
        niche: true,
        city: true,
      },
    });

    return NextResponse.json({
      active: !!activeSession,
      session: activeSession,
    });
  } catch (error) {
    return NextResponse.json({
      active: false,
      error: (error as Error).message,
    });
  }
}
