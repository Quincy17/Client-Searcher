import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sessionId = parseInt(resolvedParams.id, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "ID Sesi tidak valid." },
        { status: 400 }
      );
    }

    const session = await prisma.scrapingSession.findUnique({
      where: { id: sessionId },
      include: {
        leads: {
          orderBy: { score: "desc" },
          include: {
            outreachMessages: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error in GET /api/sessions/[id]:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sessionId = parseInt(resolvedParams.id, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "ID Sesi tidak valid." },
        { status: 400 }
      );
    }

    // Check if session exists
    const session = await prisma.scrapingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan." },
        { status: 404 }
      );
    }

    // Delete session (cascade deletes all related leads, outreachMessages, followUps automatically!)
    await prisma.scrapingSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: "Kampanye scraping berhasil dihapus beserta semua data leads terkait.",
    });
  } catch (error) {
    console.error("Error in DELETE /api/sessions/[id]:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kampanye." },
      { status: 500 }
    );
  }
}
