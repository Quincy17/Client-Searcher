import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id, 10);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID Lead tidak valid." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { status, notes, messageText } = body;

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead tidak ditemukan." },
        { status: 404 }
      );
    }

    const updateData: {
      status?: string;
      notes?: string;
    } = {};

    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Perform transaction to update lead and outreach message safely
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update lead basic info
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      // 2. If messageText is provided, update or create the outreach message
      if (messageText !== undefined) {
        const latestMessage = await tx.outreachMessage.findFirst({
          where: { leadId },
          orderBy: { version: "desc" },
        });

        // Helper to normalize phone
        let cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
        if (cleanPhone.startsWith("08")) {
          cleanPhone = "62" + cleanPhone.substring(1);
        }
        const newWaLink = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
          : null;

        if (latestMessage) {
          // If the status is changing to approved, log the approval timestamp
          const approvedAt = status === "approved" ? new Date() : latestMessage.approvedAt;
          
          await tx.outreachMessage.update({
            where: { id: latestMessage.id },
            data: {
              messageText,
              waLink: newWaLink,
              approvedAt,
            },
          });
        } else {
          // Fallback if message didn't exist
          await tx.outreachMessage.create({
            data: {
              leadId,
              messageText,
              version: 1,
              waLink: newWaLink,
              approvedAt: status === "approved" ? new Date() : null,
            },
          });
        }
      } else if (status === "approved") {
        // If they approved without editing, just update the approvedAt timestamp
        const latestMessage = await tx.outreachMessage.findFirst({
          where: { leadId },
          orderBy: { version: "desc" },
        });
        if (latestMessage) {
          await tx.outreachMessage.update({
            where: { id: latestMessage.id },
            data: { approvedAt: new Date() },
          });
        }
      }

      return updatedLead;
    });

    return NextResponse.json({
      success: true,
      message: "Lead berhasil diperbarui.",
      lead: result,
    });
  } catch (error) {
    console.error("Error in PATCH /api/leads/[id]:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
