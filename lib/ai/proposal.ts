import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, getPromptData } from "./prompts";

interface LeadData {
  name: string;
  category?: string | null;
  city: string;
  rating?: number | null;
  reviewCount?: number | null;
  score: number;
  recommendedService?: string | null;
  hasWebsite: boolean;
  hasCustomEmail: boolean;
}

interface ProposalGenerationResult {
  messageText: string;
  miniAudit: string;
  isMock: boolean;
}

/**
 * Generate proposal message and audit summary using Gemini API
 */
export async function generateProposal(lead: LeadData): Promise<ProposalGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // gemini-1.5-flash or gemini-2.0-flash support free tier

  const promptVars = getPromptData(lead);
  
  // Construct the prompt by replacing placeholders
  const userPrompt = `
Silakan generate proposal outreach untuk bisnis berikut:
- Nama Bisnis: ${promptVars.name}
- Kategori/Niche: ${promptVars.category}
- Kota: ${promptVars.city}
- Masalah Digital: ${promptVars.issues}
- Rekomendasi Layanan: ${promptVars.recommendedService}
- Memiliki Website: ${promptVars.hasWebsite}
- Rating Google Maps: ${promptVars.rating}
  `;

  // Fallback template generator in case the API key is not configured
  const getFallbackTemplate = (): ProposalGenerationResult => {
    const portfolioUrl = "https://YOUR_DOMAIN/assets/agency-profile.pdf";
    const webStatus = lead.hasWebsite 
      ? "website resmi Anda kurang responsif atau hanya berupa link bio media sosial"
      : "belum memiliki website resmi untuk {name}";
    
    let messageText = `Halo Kak Pemilik ${lead.name},\n\n`;
    messageText += `Perkenalkan saya dari Tim Agency IT. Kemarin saya sempat mencari ${lead.category || "bisnis menarik"} di area ${lead.city} lewat Google Maps, dan saya melihat ${lead.name} memiliki ulasan yang luar biasa (${lead.rating || "bagus"} bintang)! ⭐\n\n`;
    
    if (!lead.hasWebsite) {
      messageText += `Saat mencoba cari tahu lebih lanjut, kami perhatikan ${lead.name} belum memiliki website resmi. Di era digital sekarang, memiliki website sendiri sangat penting untuk meningkatkan kredibilitas dan memudahkan pelanggan di ${lead.city} melihat menu/layanan serta melakukan booking langsung secara online. 🚀\n\n`;
      messageText += `Untuk ${lead.name}, kami sangat merekomendasikan **${lead.recommendedService}** agar pesanan atau booking pelanggan bisa otomatis masuk via WhatsApp secara rapi.\n\n`;
    } else {
      messageText += `Kami perhatikan ${lead.name} sudah punya link profil digital, namun tampaknya belum dioptimalkan sebagai landing page penjualan utama. Dengan **${lead.recommendedService}**, kita bisa meningkatkan konversi kunjungan menjadi closing penjualan dengan lebih cepat! 🎯\n\n`;
    }
    
    messageText += `Sebagai perkenalan, kami sedang mengadakan program gratis pembuatan mockup/gambaran awal website khusus untuk bisnis terpilih di ${lead.city}. Boleh kami buatkan mockup gratis untuk ${lead.name}? Anda bisa melihat beberapa portfolio kami di sini: ${portfolioUrl}\n\n`;
    messageText += `Kalau Kakak senggang, boleh kita ngobrol santai sebentar via WA? Terima kasih banyak atas waktunya dan sukses selalu untuk ${lead.name}! 🙏`;

    const miniAudit = lead.hasWebsite
      ? `Rating sangat baik (${lead.rating || "N/A"}) tetapi website digital belum optimal untuk mengonversi prospek.`
      : `Rating bagus (${lead.rating || "N/A"}) tetapi belum memiliki website resmi untuk memudahkan booking digital pelanggan di ${lead.city}.`;

    return {
      messageText,
      miniAudit,
      isMock: true,
    };
  };

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY is not configured. Falling back to static template generation.");
    return getFallbackTemplate();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const textResponse = result.response.text();
    
    if (!textResponse) {
      throw new Error("Empty response from Gemini API");
    }

    const jsonOutput = JSON.parse(textResponse.trim());
    
    return {
      messageText: jsonOutput.messageText || getFallbackTemplate().messageText,
      miniAudit: jsonOutput.miniAudit || getFallbackTemplate().miniAudit,
      isMock: false,
    };
  } catch (error) {
    console.error("Error generating proposal via Gemini API:", error);
    // Return fallback if API fails (e.g. rate limit, bad API key)
    return {
      ...getFallbackTemplate(),
      miniAudit: `[API Error Fallback] ${getFallbackTemplate().miniAudit}`
    };
  }
}
