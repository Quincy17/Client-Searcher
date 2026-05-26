import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateProposal } from "@/lib/ai/proposal";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "ID Lead wajib disertakan." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(leadId, 10) },
      include: {
        session: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead tidak ditemukan." },
        { status: 404 }
      );
    }

    // Call the proposal generator
    console.log(`Regenerating proposal via Gemini for ${lead.name}...`);
    const proposal = await generateProposal({
      name: lead.name,
      category: lead.category,
      city: lead.session.city,
      rating: lead.rating,
      reviewCount: lead.reviewCount,
      score: lead.score,
      recommendedService: lead.recommendedService,
      hasWebsite: lead.hasWebsite,
      hasCustomEmail: lead.hasCustomEmail,
    });

    // Get the latest message version to increment
    const latestMessage = await prisma.outreachMessage.findFirst({
      where: { leadId: lead.id },
      orderBy: { version: "desc" },
    });

    const nextVersion = latestMessage ? latestMessage.version + 1 : 1;

    // Helper to normalize phone
    let cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
    if (cleanPhone.startsWith("08")) {
      cleanPhone = "62" + cleanPhone.substring(1);
    }
    const waLink = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(proposal.messageText)}`
      : null;

    // Create a new outreach message record (retains history)
    const newMessage = await prisma.outreachMessage.create({
      data: {
        leadId: lead.id,
        messageText: proposal.messageText,
        version: nextVersion,
        waLink: waLink,
      },
    });

    // Update lead notes to log the regeneration
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        notes: `${lead.notes || ""}\nRegenerated message version ${nextVersion} at ${new Date().toLocaleTimeString()}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pesan outreach berhasil di-regenerate.",
      outreachMessage: newMessage,
    });
  } catch (error) {
    console.error("Error in POST /api/generate:", error);
    return NextResponse.json(
      { error: "Gagal me-regenerate proposal. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
