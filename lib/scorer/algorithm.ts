import { getRecommendedService } from "./service-matcher";

interface LeadScoringInput {
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  instagramUrl?: string | null;
  category?: string | null;
  niche?: string | null;
}

interface ScoringResult {
  score: number;
  recommendedService: string;
  hasWebsite: boolean;
  hasCustomEmail: boolean; // true if they have their own domain email, false otherwise
  breakdown: {
    noWebsite: number;
    bioLinkOnly: number;
    highRating: number;
    noLandingPage: number;
    highReviews: number;
    noBusinessEmail: number;
    hasInstagram: number;
  };
}

/**
 * Check if a website URL is just a bio link or social media page
 */
export function isBioLinkOrSocialMedia(url?: string | null): boolean {
  if (!url) return false;
  const lowercaseUrl = url.toLowerCase();
  const bioPatterns = [
    "linktr.ee",
    "biolinky",
    "instagram.com",
    "facebook.com",
    "fb.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "wa.me",
    "wa.link",
    "youtube.com",
    "pinterest.com",
    "google.com/maps",
    "maps.google",
    "site.google"
  ];
  return bioPatterns.some((pattern) => lowercaseUrl.includes(pattern));
}

/**
 * Calculates lead score based on the implementation plan's rules:
 * - Tidak punya website: +40
 * - Website jelek / link bio saja: +30
 * - Rating Google > 4.0: +20
 * - Belum punya landing page (jika tidak punya web atau web hanya bio link): +20
 * - Jumlah review > 20: +15
 * - Tidak ada domain email bisnis: +15
 * - Ada link Instagram: +10
 * Max Score: 150
 */
export function calculateLeadScore(lead: LeadScoringInput): ScoringResult {
  let score = 0;
  const breakdown = {
    noWebsite: 0,
    bioLinkOnly: 0,
    highRating: 0,
    noLandingPage: 0,
    highReviews: 0,
    noBusinessEmail: 0,
    hasInstagram: 0,
  };

  const url = lead.website?.trim() || "";
  const hasWebsite = url.length > 0;
  const isBioLink = hasWebsite && isBioLinkOrSocialMedia(url);

  // 1. Website Presence Scoring
  if (!hasWebsite) {
    breakdown.noWebsite = 40;
    score += 40;
  } else if (isBioLink) {
    breakdown.bioLinkOnly = 30;
    score += 30;
  }

  // 2. Rating Google > 4.0
  if (lead.rating && lead.rating > 4.0) {
    breakdown.highRating = 20;
    score += 20;
  }

  // 3. Landing Page Presence
  // If they don't have a website or if their website is just a social/bio link, they don't have a real landing page
  if (!hasWebsite || isBioLink) {
    breakdown.noLandingPage = 20;
    score += 20;
  }

  // 4. Review Count > 20
  if (lead.reviewCount && lead.reviewCount > 20) {
    breakdown.highReviews = 15;
    score += 15;
  }

  // 5. Business Email Domain
  // If they don't have a website, or they only have a bio link, they almost certainly don't have a custom business email domain.
  // We'll set hasCustomEmail to true only if they have a non-bio website.
  const hasCustomEmail = hasWebsite && !isBioLink;
  if (!hasCustomEmail) {
    breakdown.noBusinessEmail = 15;
    score += 15;
  }

  // 6. Instagram link present
  const hasInstagram = lead.instagramUrl && lead.instagramUrl.trim().length > 0;
  if (hasInstagram) {
    breakdown.hasInstagram = 10;
    score += 10;
  }

  const recommendedService = getRecommendedService(lead.category, lead.niche);

  return {
    score,
    recommendedService,
    hasWebsite: hasWebsite && !isBioLink, // consider it has a real website only if not a bio-link
    hasCustomEmail,
    breakdown,
  };
}
