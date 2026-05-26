/**
 * Matches a Google Maps business category to a recommended IT agency service
 */
export function getRecommendedService(category?: string | null, niche?: string | null): string {
  const combined = `${category ?? ""} ${niche ?? ""}`.toLowerCase();

  if (
    combined.includes("restaurant") ||
    combined.includes("cafe") ||
    combined.includes("makan") ||
    combined.includes("kuliner") ||
    combined.includes("kopi") ||
    combined.includes("warung") ||
    combined.includes("bakso") ||
    combined.includes("soto") ||
    combined.includes("resto") ||
    combined.includes("bistro")
  ) {
    return "Landing page + menu digital + reservasi online";
  }

  if (
    combined.includes("klinik") ||
    combined.includes("clinic") ||
    combined.includes("salon") ||
    combined.includes("spa") ||
    combined.includes("barber") ||
    combined.includes("pijat") ||
    combined.includes("dokter") ||
    combined.includes("doctor") ||
    combined.includes("beauty")
  ) {
    return "Appointment & booking system";
  }

  if (
    combined.includes("hotel") ||
    combined.includes("villa") ||
    combined.includes("homestay") ||
    combined.includes("resort") ||
    combined.includes("penginapan") ||
    combined.includes("kost")
  ) {
    return "Booking system + galeri kamar";
  }

  if (
    combined.includes("sekolah") ||
    combined.includes("school") ||
    combined.includes("kursus") ||
    combined.includes("les") ||
    combined.includes("academy") ||
    combined.includes("universitas") ||
    combined.includes("college") ||
    combined.includes("training")
  ) {
    return "Sistem akademik + formulir pendaftaran online";
  }

  if (
    combined.includes("toko") ||
    combined.includes("shop") ||
    combined.includes("retail") ||
    combined.includes("boutique") ||
    combined.includes("mart") ||
    combined.includes("supermarket") ||
    combined.includes("umkm") ||
    combined.includes("pasar") ||
    combined.includes("distributor")
  ) {
    return "Katalog produk digital + WhatsApp order";
  }

  // Fallback for professional services, contractors, others
  return "Company profile web + portfolio";
}
