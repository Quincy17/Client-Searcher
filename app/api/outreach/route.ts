import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { leadId, channel = "whatsapp", notes = "Outreach awal via WhatsApp." } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "ID Lead wajib disertakan." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(leadId, 10) },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead tidak ditemukan." },
        { status: 404 }
      );
    }

    // Update lead status and increment follow-up count
    const updatedLead = await prisma.$transaction(async (tx) => {
      // 1. Log the follow-up history
      await tx.followUp.create({
        data: {
          leadId: lead.id,
          actionType: "contacted",
          channel: channel,
          notes: notes,
        },
      });

      // 2. Update lead status
      return await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: "contacted",
          followUpCount: {
            increment: 1,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Outreach berhasil dicatat dan status lead diperbarui menjadi 'contacted'.",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Error in POST /api/outreach:", error);
    return NextResponse.json(
      { error: "Gagal mencatat log outreach." },
      { status: 500 }
    );
  }
}
