import { chromium } from "playwright";
import { prisma } from "../db/prisma";
import { delay, getRandomUserAgent, getEvasionHeaders } from "./stealth";
import { extractBusinessDetails } from "./extractor";
import { calculateLeadScore } from "../scorer/algorithm";
import { generateProposal } from "../ai/proposal";

interface ScraperResult {
  success: boolean;
  totalFound: number;
  error?: string;
}

/**
 * Normalizes phone numbers to a digits-only format suitable for wa.me links
 * e.g., "+62 812-3456-7890" -> "6281234567890"
 */
function normalizePhoneForWA(phone?: string | null): string | null {
  if (!phone) return null;
  // Remove all non-digits, keep leading '+' if it's there temporarily
  let cleaned = phone.replace(/[^0-9+]/g, "");
  
  // If it starts with '+', remove it
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  
  // If it starts with '08', change to '628' (Indonesian standard)
  if (cleaned.startsWith("08")) {
    cleaned = "62" + cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Runs the Google Maps Playwright Scraper
 */
export async function scrapeGoogleMaps(
  sessionId: number,
  city: string,
  niche: string,
  limitCount: number
): Promise<ScraperResult> {
  console.log(`Starting scrape session ${sessionId} for niche "${niche}" in city "${city}" (limit: ${limitCount})`);
  
  // Update session status to running
  await prisma.scrapingSession.update({
    where: { id: sessionId },
    data: { status: "running" },
  });

  let browser;
  try {
    // Launch headless browser
    browser = await chromium.launch({
      headless: true, // Run headless inside API routes
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: "id-ID",
      extraHTTPHeaders: getEvasionHeaders(),
    });

    const page = await context.newPage();
    
    // Construct direct search URL
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(niche + " di " + city)}`;
    console.log(`Navigating to search URL: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await delay(3000, 5000);

    // Collect listing URLs by scrolling
    let uniqueUrls: string[] = [];
    let scrollAttempts = 0;
    const maxScrollAttempts = 30;

    console.log("Scrolling results list to collect URLs...");
    
    while (uniqueUrls.length < limitCount && scrollAttempts < maxScrollAttempts) {
      // Check if left pane feed exists
      const feedLocator = page.locator("div[role='feed']");
      const feedExists = (await feedLocator.count()) > 0;
      
      if (feedExists) {
        await feedLocator.first().evaluate((el) => el.scrollBy(0, 1200));
      } else {
        await page.evaluate(() => window.scrollBy(0, 1000));
      }

      await delay(1500, 3000);

      // Collect place links
      const listings = page.locator("a[href*='/maps/place/']");
      const count = await listings.count();
      
      for (let i = 0; i < count; i++) {
        const href = await listings.nth(i).getAttribute("href");
        if (href) {
          // Clean up the URL to preserve consistency
          const cleanUrl = href.split("?")[0];
          if (!uniqueUrls.includes(cleanUrl)) {
            uniqueUrls.push(cleanUrl);
          }
        }
      }

      console.log(`Found ${uniqueUrls.length} unique listings so far...`);

      // Check if reached the end of the list
      const endText = await page.locator("text='Anda telah mencapai akhir daftar.'").count() > 0 ||
                      await page.locator("text='You\'ve reached the end of the list.'").count() > 0 ||
                      await page.locator("span:has-text('akhir daftar')").count() > 0 ||
                      await page.locator("span:has-text('end of the list')").count() > 0;
      
      if (endText) {
        console.log("Reached end of Google Maps listings");
        break;
      }

      scrollAttempts++;
    }

    const targetUrls = uniqueUrls.slice(0, limitCount);
    console.log(`Finished discovery. Will process ${targetUrls.length} leads.`);

    let successCount = 0;

    // Process each business details page
    for (let index = 0; index < targetUrls.length; index++) {
      const url = targetUrls[index];
      console.log(`Processing lead ${index + 1}/${targetUrls.length}: ${url}`);

      try {
        // Go directly to the place page
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
        await delay(2000, 4000);

        // Extract details
        const details = await extractBusinessDetails(page);
        
        if (!details.name) {
          console.log(`Skipping index ${index} due to missing name`);
          continue;
        }

        // Calculate scores and matchmaking
        const scoring = calculateLeadScore({
          website: details.website,
          rating: details.rating,
          reviewCount: details.reviewCount,
          instagramUrl: details.instagramUrl,
          category: details.category,
          niche: niche,
        });

        // Save lead to database
        const lead = await prisma.lead.create({
          data: {
            sessionId: sessionId,
            name: details.name,
            address: details.address,
            phone: details.phone,
            website: details.website,
            rating: details.rating,
            reviewCount: details.reviewCount,
            category: details.category || niche,
            instagramUrl: details.instagramUrl,
            hasWebsite: scoring.hasWebsite,
            hasCustomEmail: scoring.hasCustomEmail,
            score: scoring.score,
            recommendedService: scoring.recommendedService,
            status: "scored",
            notes: `Scraped successfully. Rating: ${details.rating ?? "N/A"} (${details.reviewCount ?? 0} reviews). Score: ${scoring.score}.`,
          },
        });

        // Pre-generate the AI proposal
        console.log(`Calling Gemini API to generate proposal for ${details.name}...`);
        const proposal = await generateProposal({
          name: lead.name,
          category: lead.category,
          city: city,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
          score: lead.score,
          recommendedService: lead.recommendedService,
          hasWebsite: lead.hasWebsite,
          hasCustomEmail: lead.hasCustomEmail,
        });

        // Save generated outreach message
        const normalizedPhone = normalizePhoneForWA(lead.phone);
        const waLink = normalizedPhone 
          ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(proposal.messageText)}`
          : null;

        await prisma.outreachMessage.create({
          data: {
            leadId: lead.id,
            messageText: proposal.messageText,
            version: 1,
            waLink: waLink,
          },
        });

        successCount++;
        
        // Update total found count incrementally
        await prisma.scrapingSession.update({
          where: { id: sessionId },
          data: { totalFound: successCount },
        });

      } catch (leadError) {
        console.error(`Error processing lead at URL ${url}:`, leadError);
        // Continue to the next lead rather than failing the whole session
      }
    }

    // Mark session as done
    await prisma.scrapingSession.update({
      where: { id: sessionId },
      data: {
        status: "done",
        totalFound: successCount,
      },
    });

    console.log(`Scraping session ${sessionId} completed successfully. Found ${successCount} leads.`);
    
    return {
      success: true,
      totalFound: successCount,
    };

  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(`Scraping session ${sessionId} failed:`, errorMsg);
    
    // Mark session as failed
    await prisma.scrapingSession.update({
      where: { id: sessionId },
      data: { status: "failed" },
    });

    return {
      success: false,
      totalFound: 0,
      error: errorMsg,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
